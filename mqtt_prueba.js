const mqtt = require("mqtt");
const mysql = require("mysql");

let HoraInicioDesconexion = new Date();
let ultimoEstadoSensor = null;
let horaInicioEstado = new Date();
let horaUltimoMensaje = new Date();
let sensorConectado = true; // Variable para seguir el estado de conexión del sensor
let desconexionRegistrada = false; // Variable para controlar si la desconexión ya se ha registrado

// Configuración de MQTT
const client = mqtt.connect("mqtt://localhost:1883");

const topic = 'milltap700';

// Configuración de MySQL
const connection = mysql.createConnection({
    host: "localhost",
    user: "root",
    password: "",
    database: "world",
});

// Función para calcular la diferencia de horas
function calcularDiferenciaHoras(inicio, fin) {
    if (inicio === null || fin === null) {
        return null;
    }
    const diff = fin.getTime() - inicio.getTime();
    const segundos = Math.floor(diff / 1000);
    return segundos;
}

// Llama a la función de monitoreo de conexión MQTT después de que el cliente MQTT se haya conectado
client.on('connect', () => {
    console.log('Conectado al servidor MQTT');
    // Suscripción a cada uno de los topics
    client.subscribe(topic, (err) => {
        if (err) {
            console.error('Error al suscribirse al topic', topic, err);
        } else {
            console.log('Suscrito al topic', topic);
        }
    });
});

// Función para guardar en la base de datos con fecha y hora
function guardarEnBaseDeDatos(estado, horaInicio, horaFin) {
    const color = convertirEstadoAColor(estado);
    const diferencia = calcularDiferenciaHoras(horaInicio, horaFin);

    const idMaquina = topic;
    const query = "INSERT INTO milltap700 (ID_maquina, estado, color, fecha_inicio, fecha_fin, diferencia) VALUES (?, ?, ?, ?, ?, TIMESTAMPDIFF(SECOND, fecha_inicio, fecha_fin))";

    connection.query(query, [idMaquina, estado, color, horaInicio, horaFin], (err, result) => {
        if (err) {
            console.error("Error al insertar datos del sensor en la base de datos:", err);
            return;
        }
        console.log("Datos del sensor insertados correctamente en la base de datos");
    });
}

// Función para guardar en la base de datos cuando el sensor está desconectado
function guardarEnBaseDeDatosDesconectado(horaInicio) {
    if (ultimoEstadoSensor !== null && ultimoEstadoSensor === 0 && !desconexionRegistrada) {
        const idMaquina = topic;
        const estado = 'Desconectado';
        const color = 'Desconectado'; // Color desconocido para estado desconectado
        const diferencia = null; // No hay diferencia de tiempo en este momento

        // Insertar el estado de desconexión en la base de datos con fecha de desconexión
        const query = "INSERT INTO milltap700 (ID_maquina, estado, color, fecha_inicio, fecha_fin, diferencia) VALUES (?, ?, ?, ?, ?, ?)";
        connection.query(query, [idMaquina, estado, color, horaInicio, null, diferencia], (err, result) => {
            if (err) {
                console.error("Error al insertar datos de desconexión en la base de datos:", err);
                return;
            }
            console.log("Datos de desconexión insertados correctamente en la base de datos");
        });

        // Marcamos que la desconexión ha sido registrada
        desconexionRegistrada = true;
    }
}

// Función para actualizar la fecha de fin del estado de desconexión
function actualizarFechaFinDesconectado(horaFin, horaInicio) {
    if (ultimoEstadoSensor === null || ultimoEstadoSensor === 0) {
        return; // No hay un estado anterior para actualizar
    }

    const idMaquina = topic;
    const estado = 'Desconectado';
    const query = "UPDATE milltap700 SET fecha_fin = ? , diferencia = TIMESTAMPDIFF(SECOND,fecha_inicio, fecha_fin) WHERE ID_maquina = ? AND estado = ? AND fecha_fin IS NULL and diferencia is NULL";

    connection.query(query, [horaFin, idMaquina, estado], (err, result) => {
        if (err) {
            console.error("Error al actualizar la fecha de fin del estado de desconexión:", err);
            return;
        }
        console.log("Fecha de fin del estado de desconexión actualizada correctamente");
    });
}

// Manejo de mensajes recibidos de MQTT
client.on("message", (topic, message) => {
    console.log('Mensaje recibido en el topic', topic, ':', message.toString());
    const nuevoEstado = parseInt(message.toString());

    // Actualizar el tiempo del último estado del sensor
    const horaNuevoEstado = new Date();
    horaUltimoMensaje = new Date();

    // Verificar si hay un cambio en el estado del sensor
    if (!isNaN(nuevoEstado) && nuevoEstado !== ultimoEstadoSensor) {
        if (ultimoEstadoSensor !== null) {
            if (ultimoEstadoSensor === 0) {
                guardarEnBaseDeDatosDesconectado(horaInicioEstado);
            } else if (ultimoEstadoSensor !== 20) {
                guardarEnBaseDeDatos(ultimoEstadoSensor, horaInicioEstado, horaNuevoEstado);
            }
        }
        // Actualizar el último estado del sensor y la hora de inicio del nuevo estado
        ultimoEstadoSensor = nuevoEstado;
        console.log("Ultimo estado del sensor es "+ultimoEstadoSensor)
        horaInicioEstado = horaNuevoEstado;
    }
});

setInterval(() => {
    const tiempoActual = new Date();
    const tiempoLimiteDesconexion = 10000; // 10 segundos en milisegundos

    // Si el estado anterior no es nulo ni 0 y el sensor está conectado
    if ((ultimoEstadoSensor !== null && ultimoEstadoSensor !== 0) && sensorConectado) {
        const tiempoTranscurrido = tiempoActual.getTime() - horaUltimoMensaje.getTime();
        if (tiempoTranscurrido >= tiempoLimiteDesconexion) {
            console.log("El sensor está desconectado");
            sensorConectado = false;
            guardarEnBaseDeDatos(ultimoEstadoSensor, horaInicioEstado, tiempoActual);
            HoraInicioDesconexion = tiempoActual;
            guardarEnBaseDeDatosDesconectado(HoraInicioDesconexion);
            ultimoEstadoSensor = 20;
        }
    } else if (!sensorConectado && ultimoEstadoSensor !== 20) {
        console.log("El sensor está nuevamente conectado");
        sensorConectado = true;
        actualizarFechaFinDesconectado(tiempoActual, HoraInicioDesconexion);
        horaInicioEstado = tiempoActual;
    }
}, 2000);

// Función para cambiar de estado a color
function convertirEstadoAColor(estado) {
    switch (estado) {
        case 4, 12:
            return 'Verde';
        case 2:
            return 'Rojo';
        case 8:
            return 'Azul';
        case 1:
            return 'Amarillo';
        default:
            return 'Desconocido'; // Manejar caso por defecto
    }
}

// Manejo de errores de la conexión a la base de datos
connection.connect((err) => {
    if (err) {
        console.error("Error al conectar con la base de datos:", err);
        return;
    }
    console.log("Conexión exitosa con la base de datos");
});
