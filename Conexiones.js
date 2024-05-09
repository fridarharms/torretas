const mqtt = require("mqtt");
const topics = ['milltap720:milltap720', 
                'milltap700'];
const client = mqtt.connect("mqtt://localhost:1883");
// Manejo de la conexión
client.on('connect', () => {
    console.log('Conectado al servidor MQTT');
    
    // Suscripción a cada uno de los topics
    topics.forEach(topic => {
        client.subscribe(topic, (err) => {
            if (err) {
                console.error('Error al suscribirse al topic', topic, err);
            } else {
                console.log('Suscrito al topic', topic);
            }
        });
    });
});
// Manejo de mensajes
client.on('message', (topic, message) => {
    console.log('Mensaje recibido en el topic', topic, ':', message.toString());
});

// Manejo de errores
client.on('error', (error) => {
    console.error('Error en el cliente MQTT:', error);
});