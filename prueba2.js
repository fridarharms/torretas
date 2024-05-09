// mqtt_pruebas.js
const mqtt = require("mqtt");
const mysql = require("mysql");

// Al inicio del programa, realiza una consulta para eliminar los registros con fecha_fin igual a null
function limpiarRegistrosNull(tabla, connection) {
    const query = `DELETE FROM ${tabla} WHERE fecha_fin IS NULL`;
    connection.query(query, (err, result) => {
        if (err) {
            console.error("Error al limpiar registros con fecha_fin igual a null:", err);
            return;
        }
        console.log("Registros con fecha_fin igual a null eliminados correctamente");
    });
}

function iniciarPrograma(topic, connection) {
    // Llama a la función para limpiar registros con fecha_fin igual a null
    limpiarRegistrosNull(topic, connection);

    const client = mqtt.connect("mqtt://localhost:1883");
    const topicActual = topic;
    let HoraInicioDesconexion = new Date();
    let ultimoEstadoSensor = null;
    let horaInicioEstado = new Date();
    let horaUltimoMensaje = new Date();
    let sensorConectado = true;

    client.on("connect", () => {
        console.log("Conectado al servidor MQTT");
        client.subscribe(topic, (err) => {
            if (err) {
                console.error("Error al suscribirse al topic", topic, err);
            } else {
                console.log("Suscrito al topic", topic);
            }
        });
    });

    // Función para verificar si la hora actual está dentro del rango especificado
    function dentroDelRango(horaActual, inicio, fin) {
        const horaInicio = new Date(horaActual);
        horaInicio.setHours(inicio.hora, inicio.minuto, inicio.segundo);

        const horaFin = new Date(horaActual);
        horaFin.setHours(fin.hora, fin.minuto, fin.segundo);

        return horaActual >= horaInicio && horaActual <= horaFin;
    }

    // Manejo de mensajes recibidos de MQTT
    client.on("message", (topicActual, message) => {
        console.log('Mensaje recibido en el topic', topic, ':', message.toString());
        const nuevoEstado = parseInt(message.toString());
        const horaNuevoEstado = new Date();
        horaUltimoMensaje = new Date();
        
        // Verificar si hay un cambio en el estado del sensor
        if (nuevoEstado !== ultimoEstadoSensor) {
            if (ultimoEstadoSensor !== null && ultimoEstadoSensor !== 20) {
                // Si el estado anterior no era desconectado, guardar el estado anterior en la base de datos
                guardarEnBaseDeDatos(ultimoEstadoSensor, horaInicioEstado, horaNuevoEstado, topicActual, connection);      
            }
            // Actualizar el último estado del sensor y la hora de inicio del nuevo estado
            ultimoEstadoSensor = nuevoEstado;
            horaInicioEstado = horaNuevoEstado;
            // Guardar el nuevo estado en la base de datos con fecha_fin null
            guardarEnBaseDeDatos(nuevoEstado, horaInicioEstado, null, topicActual, connection);
        }
    });

    // Verificar los cortes de hora cada minuto
    setInterval(() => {
        const tiempoActual = new Date();
        const hora = tiempoActual.getHours();
        const minuto = tiempoActual.getMinutes();
        const segundo = tiempoActual.getSeconds();

        // Definir los horarios de los cortes de hora
        const cortesHora = [
            { inicio: { hora: 8, minuto: 0, segundo: 0 }, fin: { hora: 15, minuto: 30, segundo: 0 } },
            { inicio: { hora: 15, minuto: 30, segundo: 1 }, fin: { hora: 23, minuto: 59, segundo: 59 } },
            { inicio: { hora: 0, minuto: 0, segundo: 0 }, fin: { hora: 7, minuto: 59, segundo: 59 } }
        ];

        // Verificar si estamos dentro de algún corte de hora
        const corteActual = cortesHora.find(corte => dentroDelRango(tiempoActual, corte.inicio, corte.fin));

        if (corteActual) {
            // Actualizar fecha_fin para el último registro con fecha_fin null
            actualizarFechaFinPorHora(topicActual, connection);
        }
    }, 60000);

    function guardarEnBaseDeDatos(estado, horaInicio, horaFin, tabla, connection) {
        if (estado !== null) {
            const color = convertirEstadoAColor(estado);
            const idMaquina = topic;
    
            // Primero, determinamos si hay un registro sin fecha de finalización
            const querySelect = `SELECT * FROM ${tabla} WHERE ID_maquina = ? AND estado = ? AND fecha_fin IS NULL`;
            connection.query(querySelect, [idMaquina, estado], (err, rows) => {
                if (err) {
                    console.error("Error al buscar registro sin fecha de finalización:", err);
                    return;
                }
                
                if (rows.length > 0) {
                    // Si hay un registro sin fecha de finalización, actualizamos ese registro
                    const queryUpdate = `UPDATE ${tabla} SET fecha_fin = ?, diferencia = TIMESTAMPDIFF(SECOND, fecha_inicio, ?) WHERE ID_maquina = ? AND estado = ? AND fecha_fin IS NULL`;
                    connection.query(queryUpdate, [horaFin, horaFin, idMaquina, estado], (err, result) => {
                        if (err) {
                            console.error("Error al actualizar registro existente:", err);
                            return;
                        }
                        console.log("Registro existente actualizado correctamente");
                    });
                } else {
                    // Si no hay un registro sin fecha de finalización, insertamos uno nuevo
                    const queryInsert = `INSERT INTO ${tabla} (ID_maquina, estado, color, fecha_inicio, fecha_fin, diferencia) VALUES (?, ?, ?, ?, ?, TIMESTAMPDIFF(SECOND, fecha_inicio, ?))`;
                    connection.query(queryInsert, [idMaquina, estado, color, horaInicio, horaFin, horaFin], (err, result) => {
                        if (err) {
                            console.error("Error al insertar nuevo registro:", err);
                            return;
                        }
                        console.log("Nuevo registro insertado correctamente");
                    });
                }
            });
        }
    }

    function actualizarFechaFinPorHora(topicActual, connection) {
        const tiempoActual = new Date();
        const idMaquina = topicActual;
        const horaFin = tiempoActual;

        const query = `UPDATE ${tabla} SET fecha_fin = ? , diferencia = TIMESTAMPDIFF(SECOND,fecha_inicio, fecha_fin) WHERE ID_maquina = ? AND fecha_fin IS NULL and diferencia is NULL`;

        connection.query(query, [horaFin, idMaquina], (err, result) => {
            if (err) {
                console.error("Error al actualizar la fecha de fin por hora:", err);
                return;
            }
            console.log("Fecha de fin actualizada por hora correctamente");
        });
    }

    function convertirEstadoAColor(estado) {
        switch (estado) {
            case 4:
                return 'Produccion';
            case 2:
                return 'Error';
            case 8:
                return 'Detenido';
            case 1:
                return 'Amarillo';
            case 0:
                return 'Error Tarjeta'
            default:
                return 'Desconocido';
        }
    }
}

module.exports = { iniciarPrograma };
