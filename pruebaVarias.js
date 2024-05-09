// pruebasvarias.js

const mqtt = require("mqtt");
const mysql = require("mysql");
const { iniciarPrograma } = require("./prueba1.js"); // Importamos la función desde mqtt_pruebas.js


    // Configuración de MySQL

    const connection = mysql.createConnection({
        host: "localhost",
        user: "root",
        password: "",
        database: "world",
    });
    connection.connect((err) => {
        if (err) {
            console.error("Error al conectar con la base de datos:", err);
            return;
        }
        console.log("Conexión exitosa con la base de datos");
    });
  iniciarPrograma('milltap700',connection); // Llamamos a la función con el topic actual
  iniciarPrograma('ecomill600v',connection); // Llamamos a la función con el topic actual
  iniciarPrograma('dmu50',connection); // Llamamos a la función con el topic actual
  iniciarPrograma('nhx4000',connection); // Llamamos a la función con el topic actual
  iniciarPrograma(' cmx1100v',connection); // Llamamos a la función con el topic actual
  iniciarPrograma(' nlx2500',connection); // Llamamos a la función con el topic actual
  iniciarPrograma(' chevalier',connection); // Llamamos a la función con el topic actual



//funcion mqtt para maquinas
//iniciarPrograma(topic1)
//iniciarPrograma(topic2)
//iniciarPrograma(topic3)