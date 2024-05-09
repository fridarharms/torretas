// mqtt_pruebas.js
const mqtt = require("mqtt");
const mysql = require("mysql");

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
    limpiarRegistrosNull(topic, connection);

    const client = mqtt.connect("mqtt://172.16.8.101:1883");
    const topicActual = topic;
    let HoraInicioPrograma = new Date();
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

    function calcularDiferenciaHoras(inicio, fin) {
        if (inicio === null || fin === null) {
            return null;
        }
        const diff = fin.getTime() - inicio.getTime();
        const segundos = Math.floor(diff / 1000);
        return segundos;
    }

    function guardarEnBaseDeDatos(estado, horaInicio, horaFin, tabla, connection) {
        if (estado !== null) {
            const color = convertirEstadoAColor(estado);
            const idMaquina = topic;
            const turno = determinarTurno(horaInicio.getHours(), horaInicio.getMinutes());

            const querySelect = `SELECT * FROM ${tabla} WHERE ID_maquina = ? AND estado = ? AND fecha_fin IS NULL`;
            connection.query(querySelect, [idMaquina, estado], (err, rows) => {
                if (err) {
                    console.error("Error al buscar registro sin fecha de finalización:", err);
                    return;
                }

                if (rows.length > 0) {
                    const queryUpdate = `UPDATE ${tabla} SET fecha_fin = ?, diferencia = TIMESTAMPDIFF(SECOND, fecha_inicio, ?), turno = ? WHERE ID_maquina = ? AND estado = ? AND fecha_fin IS NULL`;
                    connection.query(queryUpdate, [horaFin, horaFin, turno, idMaquina, estado], (err, result) => {
                        if (err) {
                            console.error("Error al actualizar registro existente:", err);
                            return;
                        }
                        console.log("Registro existente actualizado correctamente");
                    });
                } else {
                    const queryInsert = `INSERT INTO ${tabla} (ID_maquina, estado, color, fecha_inicio, fecha_fin, diferencia, turno) VALUES (?, ?, ?, ?, ?, TIMESTAMPDIFF(SECOND, fecha_inicio, ?), ?)`;
                    connection.query(queryInsert, [idMaquina, estado, color, horaInicio, horaFin, horaFin, turno], (err, result) => {
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

    function guardarEnBaseDeDatosDesconectado(horaInicio, tabla, connection) {
        const idMaquina = topic;
        const estado = 'Desconectado';
        const color = 'Desconectado';
        const diferencia = null;
        const turno = determinarTurno(horaInicio.getHours(), horaInicio.getMinutes());
    
        const query = `INSERT INTO ${tabla} (ID_maquina, estado, color, fecha_inicio, fecha_fin, diferencia, turno) VALUES (?, ?, ?, ?, ?, ?, ?)`;
        connection.query(query, [idMaquina, estado, color, horaInicio, null, diferencia, turno], (err, result) => {
            if (err) {
                console.error("Error al insertar datos de desconexión en la base de datos:", err);
                return;
            }
            console.log("Datos de desconexión insertados correctamente en la base de datos");
        });
    }
    
    function actualizarFechaFinDesconectado(horaFin, horaInicio, tabla, connection) {
        const idMaquina = topic;
        const estado = 'Desconectado';
        const query = `UPDATE ${tabla} SET fecha_fin = ?, diferencia = TIMESTAMPDIFF(SECOND, fecha_inicio, ?), turno = ? WHERE ID_maquina = ? AND estado = ? AND fecha_fin IS NULL and diferencia is NULL`;
    
        connection.query(query, [horaFin, horaFin, determinarTurno(horaFin.getHours(), horaFin.getMinutes()), idMaquina, estado], (err, result) => {
            if (err) {
                console.error("Error al actualizar la fecha de fin del estado de desconexión:", err);
                return;
            }
            console.log("Fecha de fin del estado de desconexión actualizada correctamente");
        });
    }

    function determinarTurno(hora, minutos) {
        if ((hora >= 8 && hora < 15) || (hora === 15 && minutos < 30)) {
            return "Matutino";
        } else if (hora >= 15 && hora < 30) {
            return "Vespertino";
        } else {
            return "Nocturno";
        }
    }

    client.on("message", (topicActual, message) => {
        const nuevoEstado = parseInt(message.toString());
        const horaNuevoEstado = new Date();
        horaUltimoMensaje = new Date();

        if (nuevoEstado !== ultimoEstadoSensor) {
            if (ultimoEstadoSensor !== null && ultimoEstadoSensor !== 20) {
                guardarEnBaseDeDatos(ultimoEstadoSensor, horaInicioEstado, horaNuevoEstado, topicActual, connection);
            }
            ultimoEstadoSensor = nuevoEstado;
            horaInicioEstado = horaNuevoEstado;
            guardarEnBaseDeDatos(nuevoEstado, horaInicioEstado, null, topicActual, connection);
}
});
setInterval(() => {
    const tiempoActual = new Date();
    const tiempoLimiteDesconexion = 45000;

    if (sensorConectado) {
        const tiempoTranscurrido = tiempoActual.getTime() - horaUltimoMensaje.getTime();
        if (tiempoTranscurrido >= tiempoLimiteDesconexion) {
            console.log("El sensor está desconectado");
            sensorConectado = false;
            if (ultimoEstadoSensor !== 20) {
                // Si el último estado no fue desconexión, lo guardamos
                guardarEnBaseDeDatos(ultimoEstadoSensor, horaInicioEstado, tiempoActual, topicActual, connection);
            }
            HoraInicioDesconexion = tiempoActual;
            guardarEnBaseDeDatosDesconectado(HoraInicioDesconexion, topicActual, connection);
            if (ultimoEstadoSensor !== 20) {
                // Si el último estado no fue desconexión, establecemos el estado en desconexión
                ultimoEstadoSensor = 20;
            }
        }
    } else if (!sensorConectado && ultimoEstadoSensor !== 20) {
        console.log("El sensor está nuevamente conectado");
        sensorConectado = true;
        // Cuando se reconecta, actualizamos el fin de la desconexión y el estado
        actualizarFechaFinDesconectado(tiempoActual, HoraInicioDesconexion, topicActual, connection);
        horaInicioEstado = tiempoActual;
    }
}, 2000);

// Manejar cortes de horas
setInterval(() => {
    const tiempoActual = new Date();
    const hora = tiempoActual.getHours();
    const minutos = tiempoActual.getMinutes();

    if ((hora === 8 && minutos === 0) || (hora === 15 && minutos === 30) || (hora === 0 && minutos === 0)) {
        console.log("Hora de corte ingresada correctamente");
        // Verificar si la máquina está desconectada
        if (!sensorConectado) {
            console.log("La máquina está desconectada, actualizando hora fin y agregando nuevo registro");

            // Actualizar la hora de fin del estado de desconexión
            actualizarFechaFinDesconectado(tiempoActual, HoraInicioDesconexion, topicActual, connection);
            horaInicioEstado = tiempoActual;

            // Agregar un nuevo registro para el estado de desconexión
            guardarEnBaseDeDatosDesconectado(tiempoActual, topicActual, connection);
        } else {
            console.log("La máquina está conectada, guardando estado actual");
            // Si la máquina está conectada, guardamos el estado actual
            guardarEnBaseDeDatos(ultimoEstadoSensor, horaInicioEstado, tiempoActual, topicActual, connection);
            horaInicioEstado = tiempoActual;
        }
    }
}, 60000); // Verificar cada minuto

function convertirEstadoAColor(estado) {
    switch (estado) {
        case 4:
            return 'Produccion';
        case 5:
                return 'Produccion';
        case 2:
            return 'Detenido';
        case 8:
            return 'Error';
        case 1:
            return 'Amarillo';
        case 0:
            return 'Detenido';
        case 6:
            return 'Produccion';
        default:
            return 'Desconocido';
        case 12:
            return 'Error';

    }
}
}

module.exports = { iniciarPrograma };