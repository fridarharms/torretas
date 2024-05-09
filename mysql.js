const mysql = require("mysql");
const readlineSync = require('readline-sync');

const connection = mysql.createConnection({
    host: 'localhost',
    user: 'root',
    password: '',
    database: 'world'
});

connection.connect((err) => {
    if (err) {
        console.error('Error al conectar con la base de datos:', err);
        return;
    }
    console.log('Conexión exitosa con la base de datos');
});

const EstadoSensorActual = 8;

function insertarDatosSensor(estadoSensor) {
    const query = "INSERT INTO datos_sensor (estado) VALUES (?)";
    connection.query(query, [estadoSensor], (err, result) => {
        if (err) {
            console.error('Error al insertar datos del sensor:', err);
            return;
        }
        console.log('Datos del sensor insertados correctamente');
    });
}

while (true) {
    const estadoSensor = parseInt(readlineSync.question('Por favor ingresa el estado del sensor: '));
    
    if (estadoSensor === EstadoSensorActual) {
        console.log('El estado del sensor coincide con el estado deseado. Saliendo...');
        break;
    } else {
        insertarDatosSensor(estadoSensor);
    }
}

connection.end();