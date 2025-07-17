# PT-API

IA que utiliza la API 1.5 Flash de Gemini, con una interfaz en HTML como frontend y Python como backend.  
Funciona de manera local con acceso a Internet  

---
## API
Se tiene que crear un archivo .env con una API para el dispositivo con Google IA Studio  

---  

## Tecnologías utilizadas

### Backend
- Python 3.10

### Frontend
- HTML5  
- CSS  
- JavaScript

---

## Instalaciones necesarias

Ejecuta el siguiente comando para instalar las dependencias necesarias:

```bash
pip install Flask Flask-Cors python-dotenv gtts google-generativeai   

```   
## Automatizar   
### Archivo start.bat   
Este archivo hace:   
- Arrancar el servidor Flask en una consola visible para que puedas ver los logs.   
- Arrancar un servidor estático para la carpeta templates en otro puerto.   
- Abrir Chrome apuntando al servidor estático, en modo fullscreen.   

```bash
@echo off
cd /d "C:\Users\dhanq\OneDrive\Documentos\tests\prueba visual"

:: Iniciar servidor Flask (terminal visible)
start "Servidor Flask" cmd /k "python server.py"

:: Espera 5 segundos para que Flask arranque
timeout /t 5 

:: Iniciar servidor HTTP estático para carpeta 'templates'
start "Servidor HTML" cmd /k "python -m http.server 8000 --directory templates"

:: Espera 3 segundos para que arranque el servidor estático
timeout /t 3 

:: Abrir Chrome en modo kiosko apuntando al index.html
start chrome --kiosk "http://127.0.0.1:8000/index.html"

```

## Cómo salir del modo fullscreen de Chrome
- Pulsa Alt + F4 para cerrar la ventana.
- O usa el administrador de tareas para cerrar Chrome.
