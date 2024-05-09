<?php
// Conectar a la base de datos
$conn = new mysqli('localhost ', 'root', '', 'world');

// Verificar la conexión
if ($conn->connect_error) {
    die("Error de conexión: " . $conn->connect_error);
}

// Insertar un nuevo registro en la tabla
$sql = "INSERT INTO datos_sensor (fecha_fin) VALUES (CURRENT_TIMESTAMP)";
if ($conn->query($sql) === TRUE) {
    echo "Nuevo registro insertado correctamente";
} else {
    echo "Error al insertar el registro: " . $conn->error;
}
$conn->close()

?>
