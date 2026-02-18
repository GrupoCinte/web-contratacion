// =====================================================
// EJEMPLO DE CONFIGURACIÓN DE NODO DYNAMODB EN N8N
// =====================================================
//
// Copia esta configuración en tus workflows de n8n
//
// =====================================================

{
    "name": "Actualizar Estado en DynamoDB",
        "type": "n8n-nodes-base.awsDynamoDb",
            "position": [250, 300],
                "parameters": {
        "resource": "item",
            "operation": "put",

                // Nombre de tu tabla
                "tableName": "n8n_monitoring",

                    // Configuración del item a escribir
                    "item": {
            "item": [
                {
                    "key": "executionId",
                    "type": "string",
                    // ⭐ IMPORTANTE: Usa el MISMO executionId en TODOS los nodos del workflow
                    "value": "={{ $workflow.id }}_={{ $execution.id }}"
                },
                {
                    "key": "workflowName",
                    "type": "string",
                    // Nombre del workflow (se obtiene automáticamente)
                    "value": "={{ $workflow.name }}"
                },
                {
                    "key": "currentNodeName",
                    "type": "string",
                    // 👇 CAMBIA ESTO según qué paso estás monitoreando
                    "value": "Procesando datos con Bedrock"
                },
                {
                    "key": "status",
                    "type": "string",
                    // ⭐ Usa "running" mientras el workflow está en ejecución
                    // Cambia a "success" o "error" al finalizar
                    "value": "running"
                },
                {
                    "key": "timestamp",
                    "type": "number",
                    // Timestamp actual en milisegundos
                    "value": "={{ Date.now() }}"
                }
            ]
        }
    },
    "credentials": {
        "aws": {
            "id": "TUS_CREDENCIALES_AWS_ID",
                "name": "AWS account"
        }
    }
}

// =====================================================
// EJEMPLOS DE currentNodeName según el paso
// =====================================================

// Al inicio del workflow:
// "currentNodeName": "Iniciando proceso"

// Durante consulta a DynamoDB:
// "currentNodeName": "Consultando candidatos en DynamoDB"

// Durante llamada a Bedrock:
// "currentNodeName": "Procesando con Bedrock AI"

// Enviando email:
// "currentNodeName": "Enviando notificación"

// Al finalizar exitosamente:
// "currentNodeName": "Completado"
// "status": "success"  ← ⚠️ Cambia el status

// Si hay error:
// "currentNodeName": "Error en el proceso"
// "status": "error"  ← ⚠️ Cambia el status

// =====================================================
// PASOS PARA IMPLEMENTAR EN N8N
// =====================================================

/*
1. Abre tu workflow en n8n

2. Agrega un nodo "AWS DynamoDB" después del trigger

3. Configuración del nodo:
   - Operación: "Put"
   - Tabla: "n8n_monitoring"
   
4. En la sección "Item to Insert/Update", haz click en:
   "Add Field" 5 veces para agregar los 5 campos

5. Configura cada campo:
   
   Campo 1:
   - Key: executionId
   - Type: String
   - Value:={{ $workflow.id }}_={{ $execution.id }}
   
   Campo 2:
   - Key: workflowName
   - Type: String
   - Value: {{ $workflow.name }}
   
   Campo 3:
   - Key: currentNodeName
   - Type: String
   - Value: "Iniciando proceso"  (cambia según tu paso)
   
   Campo 4:
   - Key: status
   - Type: String
   - Value: running
   
   Campo 5:
   - Key: timestamp
   - Type: Number
   - Value: {{ Date.now() }}

6. Copia este nodo (Ctrl+C) y pégalo en otros puntos del workflow

7. Solo cambia el "currentNodeName" en cada copia:
   - Nodo 1: "Iniciando"
   - Nodo 2: "Consultando API"
   - Nodo 3: "Procesando con IA"
   - Nodo final: "Completado" (y status: "success")

8. Guarda y ejecuta tu workflow

9. El dashboard mostrará el progreso en tiempo real
*/
