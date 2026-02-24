export const mapDynamoItemToExecution = (data) => {
    let displayName = 'Sin Nombre';

    if (data['nombre y apellido']) {
        displayName = data['nombre y apellido'];
    } else if (data.nombre_y_apellido) {
        displayName = data.nombre_y_apellido;
    } else if (data.nombre && data.apellido) {
        displayName = `${data.nombre} ${data.apellido}`;
    } else if (data.nombre) {
        displayName = data.nombre + (data.apellido ? ' ' + data.apellido : '');
    }

    const currentStatus = data.status || data.statuses || 'Desconocido';

    const { password, cedula, whatsapp_number, ...safeData } = data;

    return {
        executionId: data.whatsapp_number || whatsapp_number,
        workflowName: displayName,
        currentNodeName: currentStatus,
        status: 'running',
        timestamp: Date.now(), // Fallback timestamp 
        email: data.email,
        puesto: data.puesto,
        realStatus: currentStatus,
        fullData: safeData
    };
};
