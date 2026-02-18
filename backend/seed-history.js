import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, PutCommand } from '@aws-sdk/lib-dynamodb';
import dotenv from 'dotenv';
dotenv.config();

const client = new DynamoDBClient({
    region: process.env.AWS_REGION || 'us-east-1',
    credentials: {
        accessKeyId: process.env.AWS_ACCESS_KEY_ID,
        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY
    }
});
const docClient = DynamoDBDocumentClient.from(client);
const TABLE = process.env.DYNAMODB_TABLE_NAME || 'n8n_table_state_users';

const candidates = [
    // === 20 candidatos originales (correos actualizados) ===
    { nombre: 'Maria Fernanda Lopez Garcia', email: 'mflopez92@gmail.com', cedula: 1023456789, edad: '28 anos', puesto: 'Analista de Datos', whatsapp: 573001234567, direccion: 'Cra 15 #82-30, Bogota', salario: 3500000, status: 'finalizado' },
    { nombre: 'Carlos Andres Ramirez Ortiz', email: 'carlos.ramirez@hotmail.com', cedula: 1087654321, edad: '32 anos', puesto: 'Desarrollador Backend', whatsapp: 573109876543, direccion: 'Calle 50 #25-10, Medellin', salario: 5000000, status: 'Contrato Recibido' },
    { nombre: 'Laura Valentina Torres Pena', email: 'laura.torres.v@yahoo.com', cedula: 1034567890, edad: '25 anos', puesto: 'Disenadora UX/UI', whatsapp: 573201234567, direccion: 'Av 6 Norte #23N-45, Cali', salario: 3200000, status: 'finalizado' },
    { nombre: 'Juan Sebastian Morales Castro', email: 'jsmorales85@gmail.com', cedula: 1056789012, edad: '30 anos', puesto: 'Ingeniero DevOps', whatsapp: 573151234567, direccion: 'Calle 72 #10-34, Bogota', salario: 6000000, status: 'completado' },
    { nombre: 'Daniela Alejandra Herrera Rios', email: 'dani.herrera@hotmail.com', cedula: 1045678901, edad: '27 anos', puesto: 'Analista de Datos', whatsapp: 573181234567, direccion: 'Cra 43A #1Sur-100, Medellin', salario: 3800000, status: 'finalizado' },
    { nombre: 'Andres Felipe Gutierrez Luna', email: 'afgutierrez.dev@gmail.com', cedula: 1067890123, edad: '35 anos', puesto: 'Arquitecto de Software', whatsapp: 573121234567, direccion: 'Calle 100 #15-20, Bogota', salario: 7500000, status: 'Contrato Recibido' },
    { nombre: 'Valentina Restrepo Mejia', email: 'vale.restrepo@yahoo.com', cedula: 1078901234, edad: '24 anos', puesto: 'Community Manager', whatsapp: 573171234567, direccion: 'Cra 7 #45-12, Bucaramanga', salario: 2500000, status: 'finalizado' },
    { nombre: 'Santiago Cardenas Vargas', email: 'santi.cardenas@hotmail.com', cedula: 1089012345, edad: '29 anos', puesto: 'Analista Financiero', whatsapp: 573191234567, direccion: 'Calle 19 #4-60, Bogota', salario: 4200000, status: 'completado' },
    { nombre: 'Camila Andrea Suarez Diaz', email: 'cami.suarez26@gmail.com', cedula: 1090123456, edad: '26 anos', puesto: 'Ingeniera de Datos', whatsapp: 573141234567, direccion: 'Av Circunvalar #20-50, Pereira', salario: 4500000, status: 'finalizado' },
    { nombre: 'David Esteban Rojas Pardo', email: 'david.rojas.p@yahoo.com', cedula: 1001234567, edad: '33 anos', puesto: 'Scrum Master', whatsapp: 573161234567, direccion: 'Calle 85 #11-53, Bogota', salario: 5500000, status: 'Contrato Recibido' },
    { nombre: 'Isabella Martinez Quintero', email: 'isa.martinez99@hotmail.com', cedula: 1012345679, edad: '23 anos', puesto: 'Consultora SAP', whatsapp: 573001122334, direccion: 'Cra 9 #12-30, Manizales', salario: 2000000, status: 'finalizado' },
    { nombre: 'Nicolas Alejandro Bernal Cruz', email: 'nico.bernal@gmail.com', cedula: 1023456780, edad: '31 anos', puesto: 'Desarrollador Backend', whatsapp: 573109988776, direccion: 'Calle 93 #14-20, Bogota', salario: 6500000, status: 'completado' },
    { nombre: 'Gabriela Sanchez Ospina', email: 'gabi.sanchez@yahoo.com', cedula: 1034567891, edad: '28 anos', puesto: 'Consultora SAP', whatsapp: 573205544332, direccion: 'Cra 50 #80-10, Barranquilla', salario: 5200000, status: 'finalizado' },
    { nombre: 'Julian David Perez Agudelo', email: 'julian.perez.a@hotmail.com', cedula: 1045678902, edad: '36 anos', puesto: 'Gerente de Proyectos', whatsapp: 573152233445, direccion: 'Av El Dorado #68C-61, Bogota', salario: 8000000, status: 'Contrato Recibido' },
    { nombre: 'Sara Lucia Gonzalez Henao', email: 'sara.gonzalez.h@gmail.com', cedula: 1056789013, edad: '22 anos', puesto: 'Analista de Datos', whatsapp: 573183344556, direccion: 'Calle 10 #5-20, Armenia', salario: 1500000, status: 'finalizado' },
    { nombre: 'Miguel Angel Castro Rincon', email: 'miguel.castro@yahoo.com', cedula: 1067890124, edad: '34 anos', puesto: 'DBA Senior', whatsapp: 573124455667, direccion: 'Cra 27 #36-40, Bucaramanga', salario: 5800000, status: 'completado' },
    { nombre: 'Paula Andrea Duarte Vega', email: 'paula.duarte@hotmail.com', cedula: 1078901235, edad: '27 anos', puesto: 'Analista de Seguridad', whatsapp: 573175566778, direccion: 'Calle 80 #9-50, Bogota', salario: 4800000, status: 'finalizado' },
    { nombre: 'Felipe Andres Ospina Leal', email: 'felipe.ospina@gmail.com', cedula: 1089012346, edad: '30 anos', puesto: 'Ingeniero Cloud', whatsapp: 573196677889, direccion: 'Cra 3 #18-45, Ibague', salario: 5500000, status: 'Contrato Recibido' },
    { nombre: 'Ana Maria Velasquez Rios', email: 'anavelas.rios@yahoo.com', cedula: 1090123457, edad: '29 anos', puesto: 'Product Manager', whatsapp: 573147788990, direccion: 'Av Las Americas #62-40, Cali', salario: 6000000, status: 'finalizado' },
    { nombre: 'Diego Alejandro Munoz Sierra', email: 'diego.munoz.s@hotmail.com', cedula: 1001234568, edad: '26 anos', puesto: 'Desarrollador Backend', whatsapp: 573168899001, direccion: 'Calle 45 #28-15, Medellin', salario: 4000000, status: 'completado' },

    // === 20 candidatos nuevos ===
    { nombre: 'Natalia Rios Castaño', email: 'natalia.rios88@gmail.com', cedula: 1102345678, edad: '30 anos', puesto: 'Consultora SAP', whatsapp: 573001112233, direccion: 'Cra 12 #90-15, Bogota', salario: 5000000, status: 'finalizado' },
    { nombre: 'Oscar Eduardo Parra Mendez', email: 'oscar.parra@hotmail.com', cedula: 1113456789, edad: '34 anos', puesto: 'Ingeniero DevOps', whatsapp: 573102223344, direccion: 'Calle 34 #12-60, Medellin', salario: 5800000, status: 'completado' },
    { nombre: 'Luisa Fernanda Acosta Gil', email: 'luisa.acosta.g@yahoo.com', cedula: 1124567890, edad: '26 anos', puesto: 'Analista de Datos', whatsapp: 573203334455, direccion: 'Av 3N #50-12, Cali', salario: 3600000, status: 'finalizado' },
    { nombre: 'Alejandro Jose Navarro Ruiz', email: 'alejo.navarro@gmail.com', cedula: 1135678901, edad: '28 anos', puesto: 'Desarrollador Backend', whatsapp: 573154445566, direccion: 'Cra 70 #45-20, Bogota', salario: 4800000, status: 'Contrato Recibido' },
    { nombre: 'Marcela Patricia Cifuentes', email: 'marcela.cifuentes@hotmail.com', cedula: 1146789012, edad: '33 anos', puesto: 'Gerente de Proyectos', whatsapp: 573185556677, direccion: 'Calle 116 #18-30, Bogota', salario: 7800000, status: 'finalizado' },
    { nombre: 'Esteban Camilo Vera Ospina', email: 'esteban.vera@yahoo.com', cedula: 1157890123, edad: '25 anos', puesto: 'Scrum Master', whatsapp: 573126667788, direccion: 'Cra 9 #32-50, Bucaramanga', salario: 5200000, status: 'completado' },
    { nombre: 'Catalina Gomez Arango', email: 'cata.gomez95@gmail.com', cedula: 1168901234, edad: '27 anos', puesto: 'Disenadora UX/UI', whatsapp: 573177778899, direccion: 'Calle 8 #15-40, Pereira', salario: 3400000, status: 'finalizado' },
    { nombre: 'Ricardo Antonio Florez Marin', email: 'ricardo.florez@hotmail.com', cedula: 1179012345, edad: '38 anos', puesto: 'Arquitecto de Software', whatsapp: 573198889900, direccion: 'Av Boyaca #68-22, Bogota', salario: 8200000, status: 'Contrato Recibido' },
    { nombre: 'Monica Andrea Salazar Duque', email: 'monica.salazar.d@yahoo.com', cedula: 1180123456, edad: '31 anos', puesto: 'Product Manager', whatsapp: 573149990011, direccion: 'Cra 23 #42-15, Manizales', salario: 5800000, status: 'completado' },
    { nombre: 'Sergio Ivan Montoya Zapata', email: 'sergio.montoya@gmail.com', cedula: 1191234567, edad: '29 anos', puesto: 'Ingeniero Cloud', whatsapp: 573160001122, direccion: 'Calle 52 #76-30, Medellin', salario: 5600000, status: 'finalizado' },
    { nombre: 'Adriana Lucia Betancur Correa', email: 'adriana.betancur@hotmail.com', cedula: 1202345678, edad: '24 anos', puesto: 'Analista de Datos', whatsapp: 573001133244, direccion: 'Cra 5 #10-25, Armenia', salario: 3200000, status: 'finalizado' },
    { nombre: 'Fernando Jose Prieto Galindo', email: 'fernando.prieto@yahoo.com', cedula: 1213456789, edad: '37 anos', puesto: 'DBA Senior', whatsapp: 573102244355, direccion: 'Av 68 #30-10, Bogota', salario: 6200000, status: 'Contrato Recibido' },
    { nombre: 'Claudia Marcela Pineda Leon', email: 'claudia.pineda@gmail.com', cedula: 1224567890, edad: '32 anos', puesto: 'Consultora SAP', whatsapp: 573203355466, direccion: 'Calle 20 #8-60, Ibague', salario: 5400000, status: 'completado' },
    { nombre: 'Jorge Luis Henao Caicedo', email: 'jorge.henao.c@hotmail.com', cedula: 1235678901, edad: '35 anos', puesto: 'Gerente de Proyectos', whatsapp: 573154466577, direccion: 'Cra 65 #48-20, Medellin', salario: 8500000, status: 'finalizado' },
    { nombre: 'Viviana Andrea Quintero Mora', email: 'viviana.quintero@yahoo.com', cedula: 1246789012, edad: '23 anos', puesto: 'Community Manager', whatsapp: 573185577688, direccion: 'Calle 5 #22-10, Popayan', salario: 2600000, status: 'finalizado' },
    { nombre: 'Hernan Dario Castrillon Ruiz', email: 'hernan.castrillon@gmail.com', cedula: 1257890123, edad: '40 anos', puesto: 'Arquitecto de Software', whatsapp: 573126688799, direccion: 'Cra 30 #52-40, Bogota', salario: 9000000, status: 'completado' },
    { nombre: 'Tatiana Paola Jaramillo Velez', email: 'tatiana.jaramillo@hotmail.com', cedula: 1268901234, edad: '28 anos', puesto: 'Analista de Seguridad', whatsapp: 573177799800, direccion: 'Av Colombia #4N-20, Cali', salario: 4600000, status: 'Contrato Recibido' },
    { nombre: 'Cristian Fabian Rincon Diaz', email: 'cristian.rincon@yahoo.com', cedula: 1279012345, edad: '26 anos', puesto: 'Desarrollador Backend', whatsapp: 573198800911, direccion: 'Calle 15 #9-35, Cucuta', salario: 4200000, status: 'finalizado' },
    { nombre: 'Lina Maria Echeverri Soto', email: 'lina.echeverri@gmail.com', cedula: 1280123456, edad: '30 anos', puesto: 'Ingeniera de Datos', whatsapp: 573149911022, direccion: 'Cra 80 #32-10, Medellin', salario: 4800000, status: 'completado' },
    { nombre: 'Andres Mauricio Trujillo Pena', email: 'andres.trujillo.p@hotmail.com', cedula: 1291234567, edad: '33 anos', puesto: 'Scrum Master', whatsapp: 573160022133, direccion: 'Calle 63 #15-50, Bogota', salario: 5400000, status: 'finalizado' },
];

function randomDate(daysAgo) {
    const now = Date.now();
    const start = now - (daysAgo * 24 * 60 * 60 * 1000);
    const random = start + Math.random() * (now - start);
    return new Date(random).toISOString();
}

function formatSalarioLetras(n) {
    const millions = Math.floor(n / 1000000);
    const thousands = Math.floor((n % 1000000) / 1000);
    const parts = [];
    const millionWords = ['', 'un', 'dos', 'tres', 'cuatro', 'cinco', 'seis', 'siete', 'ocho', 'nueve'];
    if (millions > 0) parts.push(`${millionWords[millions]} ${millions === 1 ? 'millon' : 'millones'}`);
    if (thousands > 0) parts.push(`${thousands === 500 ? 'quinientos' : thousands === 200 ? 'doscientos' : thousands === 800 ? 'ochocientos' : thousands === 300 ? 'trescientos' : thousands === 400 ? 'cuatrocientos' : thousands === 600 ? 'seiscientos' : thousands} mil`);
    return parts.join(' ') + ' pesos colombianos';
}

async function seed() {
    console.log(`Insertando ${candidates.length} candidatos historicos en ${TABLE}...`);

    for (let i = 0; i < candidates.length; i++) {
        const c = candidates[i];
        const tsStart = randomDate(45);
        const iaMinutes = 2 + Math.random() * 8;
        const tsIaDone = new Date(new Date(tsStart).getTime() + iaMinutes * 60 * 1000).toISOString();
        const waitMinutes = 450 + Math.random() * 180;
        const tsEnd = new Date(new Date(tsIaDone).getTime() + waitMinutes * 60 * 1000).toISOString();

        const item = {
            whatsapp_number: c.email,
            'nombre y apellido': c.nombre,
            email: c.email,
            cedula: c.cedula,
            edad: c.edad,
            puesto: c.puesto,
            status: c.status,
            statuses: 'true',
            whatsapp_numerico: c.whatsapp,
            documentos: 'COMPLETO',
            direccion: c.direccion,
            salario_numeros: `CO$ ${new Intl.NumberFormat('es-CO').format(c.salario)}`,
            salario_letras: formatSalarioLetras(c.salario).toUpperCase(),
            fecha_inicio: new Date(Date.now() + (7 + i) * 24 * 60 * 60 * 1000).toLocaleDateString('es-CO', { year: 'numeric', month: 'short', day: 'numeric' }),
            ts_documentos_recibidos: tsStart,
            ts_analisis_ia_completado: tsIaDone,
            ts_validacion_completada: tsEnd,
        };

        await docClient.send(new PutCommand({ TableName: TABLE, Item: item }));
        console.log(`  [${i + 1}/${candidates.length}] ${c.nombre} (${c.email}) - ${c.puesto} - ${c.status}`);
    }

    console.log('\nSeed completado.');
    console.log(`Total: ${candidates.length} candidatos insertados.`);

    const puestos = {};
    candidates.forEach(c => { puestos[c.puesto] = (puestos[c.puesto] || 0) + 1; });
    console.log('\nDistribucion por cargo:');
    Object.entries(puestos).sort((a, b) => b[1] - a[1]).forEach(([p, n]) => {
        console.log(`  ${p}: ${n} candidatos`);
    });
}

seed().catch(console.error);
