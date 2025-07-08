const canvas = document.getElementById("canvas");
const ctx = canvas.getContext("2d");
const consoleOutput = document.getElementById("console-output");
const titulo = document.getElementById("titulo");
const globe = document.querySelector('.globe');
const loaderHablando = document.getElementById("loader-hablando");


// Función para redimensionar el canvas y asegurar que el visualizador funcione correctamente
function resizeCanvas() {
    canvas.width = canvas.offsetWidth; // Ajusta el ancho del canvas a su ancho renderizado por CSS
    canvas.height = canvas.offsetHeight; // Ajusta el alto del canvas a su alto renderizado por CSS
    if (initialized) { // Solo redibujar si ya se ha inicializado el visualizador
        visualizar();
    }
}

// Ejecutar resizeCanvas al cargar la página y al cambiar el tamaño de la ventana
window.addEventListener('load', resizeCanvas);
window.addEventListener('resize', resizeCanvas);

let audioContext, analyser, freqs, mediaStream;
let recognition;
let isListening = false;
let initialized = false;
let listenTimeout; // temporizador global
const WAKE_WORD = "robot";
let processingResponse = false;
let colorBarras = "lime"//color inicial

// Referencia al elemento de salida de la consola
const consoleOutputEl = document.getElementById("console-output");
// Inicializa el texto de la consola al cargar la página
consoleOutputEl.textContent = "Consola de Python esperando por información.\n";

// Función para iniciar el reconocimiento de voz
function startRecognition() {
    if (!recognition) {
        recognition = new (window.SpeechRecognition || window.webkitSpeechRecognition)();
        recognition.lang = 'es-ES'; // Idioma español
        recognition.interimResults = false; // Solo resultados finales
        recognition.maxAlternatives = 1; // Solo la mejor alternativa
        // recognition.continuous = true;

        recognition.onstart = () => {
            console.log("onstart!!!!!!!!!")
            isListening = true;
            mostrarEstado("Llámame 'robot'");

            // document.getElementById("respuesta").textContent = ""; // COM-01: Eliminado/comentado para mantener la respuesta anterior
        };

        //Iniciar temporizador para detener reconocimiento después de 5 segundos
        // listenTimeout = setTimeout(() => {
        //   recognition.stop(); // Detener después de 5 segundos
        //   console.log("⏱ Reconocimiento detenido por timeout");
        // }, 5000);

        recognition.onresult = (event) => {
            clearTimeout(listenTimeout);
            const transcript = event.results[0][0].transcript.toLowerCase().trim();
            console.log("Transcripción:", transcript);

            if (transcript.includes(WAKE_WORD)) {
                const command = transcript.replace(WAKE_WORD, '').trim();
                mostrarEstado(`¡Activado! Enviando: "${command}"`);
                recognition.stop(); // Detener el reconocimiento para procesar
                isListening = false;
                enviarMensaje(command);
            } else {
                mostrarEstado(`Escuchaste: "${transcript}"`);
                setTimeout(() => {
                    if (!processingResponse) mostrarEstado("Llámame 'robot'");
                }, 2000); // Cambia este valor si quieres más tiempo de lectura
            }
        };

        recognition.onerror = (event) => {
            console.error("Error en SpeechRecognition:", event.error);
            document.getElementById("estado").textContent = `Error: ${event.error}. Reiniciando...`;
            isListening = false;
            setTimeout(startRecognition, 5000); // Intentar reiniciar después de 1 segundo
        };

        recognition.onend = () => {
            console.log("onend!!!!!!!!!!")
            isListening = false;
            // Reiniciar el reconocimiento solo si no estamos procesando una respuesta
            if (!processingResponse) startRecognition();
        };
    }

    // Iniciar el reconocimiento si no está escuchando
    if (!isListening) {
        try {
            recognition.start();
        } catch (e) {
            console.warn("SpeechRecognition ya estaba activo:", e);
            isListening = true; // Asegurarse de que el estado esté correcto
        }
    }
}

// Función para inicializar el sistema (micrófono y visualizador)
async function iniciarConversacion() {
    if (initialized) {
        document.getElementById("estado").textContent = "El sistema ya está activo.";
        return;
    }

    document.getElementById("estado").textContent = "Activando micrófono y visualizador...";
    initialized = true;
    // Ocultar el botón "Activar"
    const activateButton = document.querySelector('.bottom-right-button button');
    if (activateButton) {
        activateButton.style.display = 'none'; // Esto ocultará el botón
    }

    document.getElementById("estado").textContent = "Activando micrófono y visualizador...";
    initialized = true;
    // Solicitar pantalla completa
    if (document.documentElement.requestFullscreen) {
        document.documentElement.requestFullscreen();
    } else if (document.documentElement.mozRequestFullScreen) { /* Firefox */
        document.documentElement.mozRequestFullScreen();
    } else if (document.documentElement.webkitRequestFullscreen) { /* Chrome, Safari & Opera */
        document.documentElement.webkitRequestFullscreen();
    } else if (document.documentElement.msRequestFullscreen) { /* IE/Edge */
        document.documentElement.msRequestFullscreen();
    }

    try {
        mediaStream = await navigator.mediaDevices.getUserMedia({ audio: true }); // Acceder al micrófono
        audioContext = new (window.AudioContext || window.webkitAudioContext)();
        analyser = audioContext.createAnalyser();
        analyser.fftSize = 256; // Tamaño del FFT para el análisis de frecuencia
        freqs = new Uint8Array(analyser.frequencyBinCount); // Array para almacenar los datos de frecuencia
        const source = audioContext.createMediaStreamSource(mediaStream);
        source.connect(analyser); // Conectar la fuente de audio al analizador
        visualizar(); // Iniciar la visualización
        startRecognition(); // Iniciar el reconocimiento de voz
    } catch (error) {
        console.error("Error al acceder al micrófono:", error);
        document.getElementById("estado").textContent = "Error al acceder al micrófono.";
    }
}

// Función para dibujar el visualizador de audio en el canvas
function visualizar() {
    requestAnimationFrame(visualizar); // Repetir la animación en cada frame
    analyser.getByteFrequencyData(freqs); // Obtener los datos de frecuencia
    ctx.fillStyle = "#000"; // Fondo negro del canvas
    ctx.fillRect(0, 0, canvas.width, canvas.height); // Limpiar el canvas
    const barWidth = (canvas.width / freqs.length) * 2.5; // Ancho de cada barra
    let x = 0;
    for (let i = 0; i < freqs.length; i++) {
        const barHeight = freqs[i]; // Altura de la barra basada en la frecuencia
        ctx.fillStyle = colorBarras; // Color de las barras (verde neón)
        ctx.fillRect(x, canvas.height - barHeight, barWidth, barHeight); // Dibujar la barra
        x += barWidth + 1; // Mover a la siguiente posición
    }
}

// Función para enviar el mensaje al backend y reproducir la respuesta
async function enviarMensaje(message) {
    processingResponse = true; // Indica que se está procesando una respuesta
    const audioEl = document.getElementById("audio");
    const respuestaEl = document.getElementById("respuesta");
    const consoleOutputEl = document.getElementById("console-output");

    // Añadir un separador y el mensaje de carga a la consola
    consoleOutputEl.textContent += `\n--- Solicitud [${new Date().toLocaleTimeString()}] ---\n`;
    consoleOutputEl.textContent += `Cargando salida de consola...\n`;
    consoleOutputEl.scrollTop = consoleOutputEl.scrollHeight; // Desplazar al final

    audioEl.src = ""; // Limpiar el audio anterior
    respuestaEl.textContent = "Procesando respuesta..."; // Esta línea se ejecutará al recibir una nueva solicitud y sobrescribirá la respuesta anterior
    //loader
    mostrarLoader();


    try {
        // Aquí se realiza la llamada al backend. Asegúrate de que tu servidor Python esté corriendo.
        const res = await fetch('http://127.0.0.1:5000/api/robot', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ mensaje: message })
        });

        const data = await res.json();
        console.log("Respuesta del backend:", data);
        respuestaEl.textContent = data.respuesta || "No escuché";

        // Si el backend envía un campo 'console_output', lo mostramos
        if (data.console_output) {
            consoleOutputEl.textContent += `Salida de Python:\n${data.console_output}\n`;
        } else {
            consoleOutputEl.textContent += `No se recibió salida específica de la consola.\n`;
        }
        consoleOutputEl.scrollTop = consoleOutputEl.scrollHeight; // Desplazar al final

        if (data.audio_url) {
            audioEl.src = `http://127.0.0.1:5000${data.audio_url}`;
            document.getElementById("loader-2").style.display = "none";

            audioEl.play();
            fondoCanvas = "#000";
            colorBarras = "#00f4ff";
            titulo.classList.add("hablando-texto");
            globe.classList.add('hablando-color');
            consoleOutputEl.classList.add("hablando"); //  Activar efecto visual en consola
            consoleOutputEl.style.color = "#33f6ff"; // directamente en JS
            loaderHablando.classList.remove("hidden");
            loaderHablando.style.display = "flex";


            audioEl.onended = () => {
                console.log("Audio de respuesta finalizado.");
                colorBarras = "lime";
                consoleOutputEl.classList.remove("hablando"); // Quitar efecto
                titulo.classList.remove("hablando-texto");
                consoleOutputEl.style.color = "#0f0";
                globe.classList.remove('hablando-color');
                document.getElementById("loader-hablando").style.display = "none";

                loaderHablando.classList.add("hidden");
                loaderHablando.style.display = "none";
                // Ocultar loader y mostrar texto cuando termina
                mostrarEstado("Escúchame");


                processingResponse = false;
                startRecognition();
            };
        }
        else {
            processingResponse = false;
            startRecognition(); // Reiniciar el reconocimiento si no hay audio
        }
    } catch (err) {
        console.error("Error al comunicarse con el backend:", err);
        respuestaEl.textContent = `Ocurrió un error: ${err.message}`;
        mostrarEstado("Error de comunicación.");

        consoleOutputEl.textContent += `Error de conexión: ${err.message}\n`; // Mostrar error en la consola también
        consoleOutputEl.scrollTop = consoleOutputEl.scrollHeight; // Desplazar al final
        processingResponse = false;
        startRecognition(); // Reiniciar el reconocimiento en caso de error
    }
}

// Manejo de la visibilidad de la pestaña para detener/reiniciar el reconocimiento
document.addEventListener("visibilitychange", () => {
    if (document.visibilityState === "visible") {
        if (!isListening && !processingResponse && initialized) {
            setTimeout(startRecognition, 500); // Reiniciar si vuelve a ser visible
        }
    } else {
        if (recognition && isListening) {
            recognition.stop(); // Detener si la pestaña no está activa
            isListening = false;
        }
    }
});

function mostrarLoader() {
    const estado = document.getElementById("estado");
    const loader = document.getElementById("loader-2");
    estado.style.display = "none";
    loader.style.display = "grid";
}

function mostrarEstado(texto) {
    const estado = document.getElementById("estado");
    const loader = document.getElementById("loader-2");
    loader.style.display = "none";
    estado.style.display = "block";
    estado.textContent = texto;
}
