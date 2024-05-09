const mqtt = require("mqtt");
const mysql = require("mysql");

function iniciarPrograma(topic, connection, tabla) {
    const client = mqtt.connect("mqtt://localhost:1883");
    const topicActual = topic;
    let ultimoEstadoSensor = null;
    let horaInicioEstado = new Date();
    let horaUltimoMensaje = new Date();
    let sensorConectado = true;

    // Función para calcular la diferencia de horas
    function calcularDiferenciaHoras(inicio, fin) {
        if (inicio === null || fin === null) {
            return null;
        }
        const diff = fin.getTime() - inicio.getTime();
        const segundos = Math.floor(diff / 1000);
        return segundos;
    }

    // Función para guardar un nuevo estado con fecha_fin nula
    function guardarNuevoEstado(estado, horaInicio, tabla, connection) {
        const idMaquina = topic;
        const color = convertirEstadoAColor(estado);
        const query = `INSERT INTO ${tabla} (ID_maquina, estado, color, fecha_inicio, fecha_fin, diferencia) VALUES (?, ?, ?, ?, NULL, NULL)`;

        connection.query(query, [idMaquina, estado, color, horaInicio], (err, result) => {
            if (err) {
                console.error("Error al insertar el nuevo estado en la base de datos:", err);
                return;
            }
            console.log("Nuevo estado insertado en la base de datos con fecha_fin nula");
        });
    }

    // Función para eliminar estados con fecha_fin nula al inicio del programa
    function eliminarEstadosConFechaFinNula(tabla, connection) {
        const idMaquina = topic;
        const query = `DELETE FROM ${tabla} WHERE ID_maquina = ? AND fecha_fin IS NULL`;

        connection.query(query, [idMaquina], (err, result) => {
            if (err) {
                console.error("Error al eliminar estados con fecha_fin nula:", err);
                return;
            }
            console.log("Estados con fecha_fin nula eliminados correctamente al inicio del programa");
        });
    }

    // Antes de iniciar el programa, eliminar estados con fecha_fin nula
    eliminarEstadosConFechaFinNula(tabla, connection);

    // Llama a la función de monitoreo de conexión MQTT después de que el cliente MQTT se haya conectado
    client.on("connect", () => {
        console.log("Conectado al servidor MQTT");
        // Suscripción al topic correspondiente
        client.subscribe(topic, (err) => {
            if (err) {
                console.error("Error al suscribirse al topic", topic, err);
            } else {
                console.log("Suscrito al topic", topic);
            }
        });
    });

    // Manejo de mensajes recibidos de MQTT
    client.on("message", (topicActual, message) => {
        console.log('Mensaje recibido en el topic', topic, ':', message.toString());
        const nuevoEstado = parseInt(message.toString());
        // Actualizar el tiempo del último estado del sensor
        const horaNuevoEstado = new Date();
        horaUltimoMensaje = new Date();
        // Verificar si hay un cambio en el estado del sensor
        if (nuevoEstado !== ultimoEstadoSensor) {
            if (ultimoEstadoSensor !== null) {
                if (ultimoEstadoSensor !== 20) {
                    guardarNuevoEstado(ultimoEstadoSensor, horaInicioEstado, topicActual, connection);
                }
            }
            // Actualizar el último estado del sensor y la hora de inicio del nuevo estado
            ultimoEstadoSensor = nuevoEstado;
            horaInicioEstado = horaNuevoEstado;
        }
    });

    setInterval(() => {
        const tiempoActual = new Date();
        const tiempoLimiteDesconexion = 700000; // 30 segundos en milisegundos
        if (sensorConectado) {
            const tiempoTranscurrido = tiempoActual.getTime() - horaUltimoMensaje.getTime();
            if (tiempoTranscurrido >= tiempoLimiteDesconexion) {

                console.log("El sensor está desconectado");
                sensorConectado = false;
                guardarNuevoEstado(ultimoEstadoSensor, horaInicioEstado, topicActual, connection);
                HoraInicioDesconexion = tiempoActual;
                guardarNuevoEstado(HoraInicioDesconexion, topicActual, connection);
                ultimoEstadoSensor = 20;
            }
        } else if (!sensorConectado && ultimoEstadoSensor !== 20) {
            console.log("El sensor está nuevamente conectado");
            sensorConectado = true;
            actualizarFechaFinDesconectado(tiempoActual, HoraInicioDesconexion, topicActual, connection);
            horaInicioEstado = tiempoActual;
        }
    }, 2000);

    // Función para cambiar de estado a color
    function convertirEstadoAColor(estado) {
        switch (estado) {
            case 4 , 12:   //Verde
                return 'Produccion';
            case 2:        // Rojo
                return 'Error';
            case 8:        //Azul
                return 'Detenido';
            case 1:       // Amarillo
                return 'Amarillo';
            case 0:
                return 'Error Tarjeta'
            default:
                return 'Desconocido'; // Manejar caso por defecto
        }
    }
}

module.exports = { iniciarPrograma };
