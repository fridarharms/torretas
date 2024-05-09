import React from 'react';
import ReactDOM from 'react-dom';
import './index.css'; // Puedes importar tus propios estilos aquí si es necesario
import 'bootstrap/dist/css/bootstrap.min.css'; // Importa los estilos de Bootstrap
import App from './App';
import reportWebVitals from './reportWebVitals';

ReactDOM.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
  document.getElementById('root')
);

// Si necesitas medir el rendimiento de tu aplicación, puedes usar reportWebVitals
reportWebVitals();
