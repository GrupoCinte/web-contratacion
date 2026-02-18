
import { DynamoDBStreamsClient, DescribeStreamCommand, GetShardIteratorCommand, GetRecordsCommand } from '@aws-sdk/client-dynamodb-streams';
import { DynamoDBClient, DescribeTableCommand as DDBDescribeTableCommand } from '@aws-sdk/client-dynamodb';
import { unmarshall } from '@aws-sdk/util-dynamodb';

class StreamPoller {
    constructor(tableName, region, credentials, callback) {
        this.tableName = tableName;
        this.region = region;
        this.callback = callback;
        this.streamArn = null;
        this._credentials = credentials || null;

        const clientConfig = { region };
        if (this._credentials) {
            clientConfig.credentials = this._credentials;
        }

        this.streamsClient = new DynamoDBStreamsClient(clientConfig);
        this.dynamoClient = new DynamoDBClient(clientConfig);
        this.isPolling = false;
        this.shardIterators = new Map();
        this.processedShards = new Set();
        this.pollInterval = 2000;
        this.shardRefreshInterval = 60000;
        this.lastShardRefresh = 0;
        this.consecutiveErrors = 0;
        this.maxConsecutiveErrors = 5;
    }

    async start() {
        if (this.isPolling) return;
        this.isPolling = true;
        console.log(`[StreamPoller] Iniciando para tabla: ${this.tableName}`);

        try {
            this.streamArn = await this.getLatestStreamArn();
            if (!this.streamArn) {
                console.log('[StreamPoller] No se encontro Stream ARN. Verificar que DynamoDB Streams este habilitado.');
                return;
            }

            await this.refreshShards();
            this.poll();
        } catch (error) {
            console.error('[StreamPoller] Error al iniciar:', error.message);
            this.scheduleRestart(10000);
        }
    }

    async getLatestStreamArn() {
        const command = new DDBDescribeTableCommand({ TableName: this.tableName });
        const response = await this.dynamoClient.send(command);
        return response.Table.LatestStreamArn;
    }

    async refreshShards() {
        if (!this.streamArn) return;

        try {
            const command = new DescribeStreamCommand({ StreamArn: this.streamArn });
            const response = await this.streamsClient.send(command);

            const allShards = response.StreamDescription.Shards || [];
            const openShards = allShards.filter(s => !s.SequenceNumberRange.EndingSequenceNumber);

            let newShardsAdded = 0;
            for (const shard of openShards) {
                if (!this.shardIterators.has(shard.ShardId) && !this.processedShards.has(shard.ShardId)) {
                    await this.initializeShard(shard);
                    newShardsAdded++;
                }
            }

            const closedShardIds = new Set(
                allShards.filter(s => s.SequenceNumberRange.EndingSequenceNumber).map(s => s.ShardId)
            );
            for (const shardId of this.shardIterators.keys()) {
                if (closedShardIds.has(shardId)) {
                    this.shardIterators.delete(shardId);
                    this.processedShards.add(shardId);
                }
            }

            this.lastShardRefresh = Date.now();

            if (newShardsAdded > 0) {
                console.log(`[StreamPoller] ${newShardsAdded} nuevos shards. Total activos: ${this.shardIterators.size}`);
            }
        } catch (error) {
            console.error('[StreamPoller] Error al refrescar shards:', error.message);
        }
    }

    async initializeShard(shard) {
        try {
            const iteratorCmd = new GetShardIteratorCommand({
                StreamArn: this.streamArn,
                ShardId: shard.ShardId,
                ShardIteratorType: 'LATEST'
            });

            const iteratorResp = await this.streamsClient.send(iteratorCmd);
            if (iteratorResp.ShardIterator) {
                this.shardIterators.set(shard.ShardId, iteratorResp.ShardIterator);
            }
        } catch (err) {
            console.error(`[StreamPoller] Error obteniendo iterator para shard ${shard.ShardId}:`, err.message);
        }
    }

    async reInitializeShard(shardId) {
        try {
            const iteratorCmd = new GetShardIteratorCommand({
                StreamArn: this.streamArn,
                ShardId: shardId,
                ShardIteratorType: 'LATEST'
            });

            const iteratorResp = await this.streamsClient.send(iteratorCmd);
            if (iteratorResp.ShardIterator) {
                this.shardIterators.set(shardId, iteratorResp.ShardIterator);
                console.log(`[StreamPoller] Shard ${shardId} re-inicializado.`);
                return true;
            }
        } catch (err) {
            console.error(`[StreamPoller] No se pudo re-inicializar shard ${shardId}:`, err.message);
        }
        return false;
    }

    async poll() {
        if (!this.isPolling) return;

        if (Date.now() - this.lastShardRefresh > this.shardRefreshInterval) {
            await this.refreshShards();
        }

        const shardsToRemove = [];
        const shardsToReinit = [];

        for (const [shardId, iterator] of this.shardIterators.entries()) {
            try {
                const command = new GetRecordsCommand({ ShardIterator: iterator, Limit: 100 });
                const response = await this.streamsClient.send(command);

                if (response.NextShardIterator) {
                    this.shardIterators.set(shardId, response.NextShardIterator);
                } else {
                    shardsToRemove.push(shardId);
                }

                if (response.Records && response.Records.length > 0) {
                    console.log(`[StreamPoller] ${response.Records.length} records de shard ${shardId.slice(-8)}`);
                    for (const record of response.Records) {
                        this.processRecord(record);
                    }
                }

                this.consecutiveErrors = 0;

            } catch (error) {
                if (error.name === 'ExpiredIteratorException') {
                    console.log(`[StreamPoller] Iterator expirado para shard ${shardId.slice(-8)}, re-inicializando...`);
                    shardsToReinit.push(shardId);
                } else if (error.name === 'TrimmedDataAccessException') {
                    console.log(`[StreamPoller] Datos recortados en shard ${shardId.slice(-8)}, eliminando.`);
                    shardsToRemove.push(shardId);
                } else if (error.name === 'InvalidSignatureException') {
                    console.error(`[StreamPoller] Firma AWS expirada. Reiniciando clientes...`);
                    await this.recreateClients();
                    shardsToReinit.push(shardId);
                } else {
                    this.consecutiveErrors++;
                    console.error(`[StreamPoller] Error en shard ${shardId.slice(-8)} (${this.consecutiveErrors}/${this.maxConsecutiveErrors}):`, error.message);

                    if (this.consecutiveErrors >= this.maxConsecutiveErrors) {
                        console.error('[StreamPoller] Demasiados errores consecutivos. Reiniciando completamente...');
                        await this.fullRestart();
                        return;
                    }
                }
            }
        }

        for (const shardId of shardsToRemove) {
            this.shardIterators.delete(shardId);
            this.processedShards.add(shardId);
        }

        for (const shardId of shardsToReinit) {
            this.shardIterators.delete(shardId);
            const success = await this.reInitializeShard(shardId);
            if (!success) {
                this.processedShards.add(shardId);
            }
        }

        if (this.shardIterators.size > 0 && this.isPolling) {
            setTimeout(() => this.poll(), this.pollInterval);
        } else if (this.isPolling) {
            console.log(`[StreamPoller] Sin shards activos. Re-descubriendo en 5s...`);
            setTimeout(async () => {
                try {
                    this.streamArn = await this.getLatestStreamArn();
                    if (this.streamArn) {
                        this.processedShards.clear();
                        await this.refreshShards();
                    }
                    if (this.shardIterators.size > 0) {
                        this.poll();
                    } else {
                        this.scheduleRestart(10000);
                    }
                } catch (e) {
                    console.error('[StreamPoller] Re-init fallido:', e.message);
                    this.scheduleRestart(15000);
                }
            }, 5000);
        }
    }

    async recreateClients() {
        const clientConfig = { region: this.region };
        if (this._credentials) {
            clientConfig.credentials = this._credentials;
        }
        this.streamsClient = new DynamoDBStreamsClient(clientConfig);
        this.dynamoClient = new DynamoDBClient(clientConfig);
        console.log('[StreamPoller] Clientes AWS recreados.');
    }

    async fullRestart() {
        console.log('[StreamPoller] Reinicio completo...');
        this.shardIterators.clear();
        this.processedShards.clear();
        this.consecutiveErrors = 0;

        await this.recreateClients();

        setTimeout(async () => {
            try {
                this.streamArn = await this.getLatestStreamArn();
                if (this.streamArn) await this.refreshShards();
                if (this.shardIterators.size > 0) {
                    console.log(`[StreamPoller] Reinicio exitoso. ${this.shardIterators.size} shards activos.`);
                    this.poll();
                } else {
                    this.scheduleRestart(15000);
                }
            } catch (e) {
                console.error('[StreamPoller] Reinicio completo fallido:', e.message);
                this.scheduleRestart(30000);
            }
        }, 3000);
    }

    scheduleRestart(delayMs) {
        if (!this.isPolling) return;
        console.log(`[StreamPoller] Reintentando en ${delayMs / 1000}s...`);
        setTimeout(() => {
            if (this.isPolling) {
                this.shardIterators.clear();
                this.processedShards.clear();
                this.consecutiveErrors = 0;
                this.start().catch(e => {
                    console.error('[StreamPoller] Reinicio programado fallido:', e.message);
                    this.scheduleRestart(Math.min(delayMs * 2, 60000));
                });
            }
        }, delayMs);
    }

    processRecord(record) {
        if (!record.dynamodb) return;

        const newImage = record.dynamodb.NewImage ? unmarshall(record.dynamodb.NewImage) : null;
        const oldImage = record.dynamodb.OldImage ? unmarshall(record.dynamodb.OldImage) : null;

        let data = newImage || oldImage;

        if (data) {
            let displayName = 'Sin Nombre';
            if (data['nombre y apellido']) {
                displayName = data['nombre y apellido'];
            } else if (data.nombre_y_apellido) {
                displayName = data.nombre_y_apellido;
            } else if (data.nombre) {
                displayName = data.nombre + (data.apellido ? ' ' + data.apellido : '');
            }

            const currentStatus = data.status || data.statuses || 'Desconocido';

            const formattedData = {
                executionId: data.whatsapp_number,
                workflowName: displayName,
                currentNodeName: currentStatus,
                status: 'running',
                timestamp: Date.now(),
                email: data.email,
                puesto: data.puesto,
                realStatus: currentStatus,
                fullData: data
            };

            const event = {
                type: record.eventName,
                data: formattedData
            };

            this.callback(event);
        }
    }

    stop() {
        this.isPolling = false;
        this.shardIterators.clear();
        console.log('[StreamPoller] Detenido.');
    }
}

export default StreamPoller;
