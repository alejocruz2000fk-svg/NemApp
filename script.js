import { GoogleGenAI } from "https://esm.run/@google/genai";

const welcomeScreen = document.getElementById('welcome-screen');
const chatScreen = document.getElementById('chat-screen');
const btnYes = document.getElementById('btn-yes');
const btnNo = document.getElementById('btn-no');
const chatMessages = document.getElementById('chat-messages');
const chatForm = document.getElementById('chat-form');
const userInput = document.getElementById('user-input');
const apiKeyInput = document.getElementById('api-key-input');
const typingIndicator = document.getElementById('typing-indicator');

// Elementos da Câmera
const btnOpenCam = document.getElementById('btn-open-cam');
const btnCloseCam = document.getElementById('btn-close-cam');
const btnSnap = document.getElementById('btn-snap');
const cameraContainer = document.getElementById('camera-container');
const video = document.getElementById('webcam');
const canvas = document.getElementById('canvas');
const photoPreview = document.getElementById('photo-preview');
const btnRemovePhoto = document.getElementById('btn-remove-photo');

// Elementos de Áudio
const btnRecordAudio = document.getElementById('btn-record-audio');

let conversationHistory = [];
let capturedImageBase64 = null;
let mediaStream = null;
let mediaRecorder = null;
let audioChunks = [];
let isRecording = false;

btnNo?.addEventListener('click', () => {
  welcomeScreen.innerHTML = `
    <div class="py-4">
      <h2 class="text-xl font-bold text-slate-200 mb-2">Tá bom! 👍</h2>
      <p class="text-slate-400">Se mudar de ideia, basta recarregar a página.</p>
    </div>
  `;
});

btnYes?.addEventListener('click', () => {
  welcomeScreen.classList.add('hidden');
  chatScreen.classList.remove('hidden');
});

function appendMessage(sender, text) {
  const wrapper = document.createElement('div');
  wrapper.className = `flex items-start gap-3 ${sender === 'user' ? 'justify-end' : ''}`;

  if (sender === 'ai') {
    wrapper.innerHTML = `
      <div class="w-8 h-8 rounded-lg bg-blue-600 flex items-center justify-center text-xs font-bold text-white shrink-0">AI</div>
      <div class="bg-slate-700/60 border border-slate-600/50 rounded-2xl rounded-tl-none p-3.5 max-w-[80%] text-slate-200 leading-relaxed break-words">
        ${escapeHtml(text)}
      </div>
    `;
  } else {
    wrapper.innerHTML = `
      <div class="bg-blue-600 text-white rounded-2xl rounded-tr-none p-3.5 max-w-[80%] leading-relaxed break-words shadow-md">
        ${escapeHtml(text)}
      </div>
    `;
  }

  chatMessages.appendChild(wrapper);
  chatMessages.scrollTop = chatMessages.scrollHeight;
}

function escapeHtml(str) {
  return str.replace(/[&<>"']/g, (m) => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#039;'
  }[m]));
}

// Lógica da Câmera
btnOpenCam?.addEventListener('click', async () => {
  try {
    mediaStream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'user' }, audio: false });
    video.srcObject = mediaStream;
    cameraContainer.classList.remove('hidden');
  } catch (err) {
    alert("Erro ao acessar a câmera: " + err.message);
  }
});

function stopCamera() {
  if (mediaStream) {
    mediaStream.getTracks().forEach(track => track.stop());
    mediaStream = null;
  }
  cameraContainer.classList.add('hidden');
}

btnCloseCam?.addEventListener('click', stopCamera);

btnSnap?.addEventListener('click', () => {
  const context = canvas.getContext('2d');
  canvas.width = video.videoWidth;
  canvas.height = video.videoHeight;
  context.drawImage(video, 0, 0, canvas.width, canvas.height);
  
  const dataUrl = canvas.toDataURL('image/jpeg');
  capturedImageBase64 = dataUrl.split(',')[1];
  
  stopCamera();
  photoPreview.classList.remove('hidden');
});

btnRemovePhoto?.addEventListener('click', () => {
  capturedImageBase64 = null;
  photoPreview.classList.add('hidden');
});

// Lógica de Gravação de Áudio
btnRecordAudio?.addEventListener('click', async () => {
  if (!isRecording) {
    try {
      const audioStream = await navigator.mediaDevices.getUserMedia({ audio: true });
      mediaRecorder = new MediaRecorder(audioStream);
      audioChunks = [];

      mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) audioChunks.push(e.data);
      };

      mediaRecorder.onstop = async () => {
        const audioBlob = new Blob(audioChunks, { type: 'audio/webm' });
        const reader = new FileReader();
        reader.readAsDataURL(audioBlob);
        reader.onloadend = () => {
          const base64Audio = reader.result.split(',')[1];
          enviarAudioParaGemini(base64Audio);
        };
        audioStream.getTracks().forEach(track => track.stop());
      };

      mediaRecorder.start();
      isRecording = true;
      btnRecordAudio.classList.add('bg-rose-600', 'animate-pulse');
      btnRecordAudio.classList.remove('bg-slate-800');
    } catch (err) {
      alert("Erro ao acessar o microfone: " + err.message);
    }
  } else {
    mediaRecorder.stop();
    isRecording = false;
    btnRecordAudio.classList.remove('bg-rose-600', 'animate-pulse');
    btnRecordAudio.classList.add('bg-slate-800');
  }
});

async function enviarAudioParaGemini(base64Audio) {
  const apiKey = apiKeyInput.value.trim();
  if (!apiKey) {
    alert("Por favor, cole sua Gemini API Key no campo superior direito.");
    return;
  }

  appendMessage('user', '🎙️ [Áudio enviado]');
  typingIndicator.classList.remove('hidden');

  const parts = [
    { text: "Ouça este áudio e responda em texto ao usuário:" },
    { inlineData: { mimeType: "audio/webm", data: base64Audio } }
  ];

  conversationHistory.push({ role: 'user', parts });

  try {
    const ai = new GoogleGenAI({ apiKey });
    const response = await ai.models.generateContent({
      model: 'gemini-3.8-flash',
      contents: conversationHistory,
    });

    typingIndicator.classList.add('hidden');
    if (response && response.text) {
      conversationHistory.push({ role: 'model', parts: [{ text: response.text }] });
      appendMessage('ai', response.text);
    }
  } catch (error) {
    typingIndicator.classList.add('hidden');
    conversationHistory.pop();
    appendMessage('ai', `⚠️ ERRO: ${error.message || JSON.stringify(error)}`);
  }
}

// Envio de Mensagem Principal
chatForm.addEventListener('submit', async (e) => {
  e.preventDefault();
  const text = userInput.value.trim();
  if (!text && !capturedImageBase64) return;

  const apiKey = apiKeyInput.value.trim();
  if (!apiKey) {
    alert("Por favor, cole sua Gemini API Key no campo superior direito.");
    return;
  }

  const userParts = [];
  let displayMessage = text;

  if (capturedImageBase64) {
    userParts.push({
      inlineData: { mimeType: "image/jpeg", data: capturedImageBase64 }
    });
    displayMessage = text ? `📷 [Foto anexada] ${text}` : '📷 [Foto anexada] O que você vê nesta imagem?';
  }

  if (text) {
    userParts.push({ text });
  } else if (capturedImageBase64) {
    userParts.push({ text: "Analise esta imagem para mim." });
  }

  appendMessage('user', displayMessage);
  userInput.value = '';
  capturedImageBase64 = null;
  photoPreview.classList.add('hidden');
  typingIndicator.classList.remove('hidden');

  conversationHistory.push({ role: 'user', parts: userParts });

  try {
    const ai = new GoogleGenAI({ apiKey });

    const response = await ai.models.generateContent({
      model: 'gemini-3.8-flash',
      contents: conversationHistory,
      config: {
        systemInstruction: "Você é um assistente virtual amigável em um aplicativo web. Responda de forma clara e direta."
      }
    });

    typingIndicator.classList.add('hidden');
    
    if (response && response.text) {
      conversationHistory.push({ role: 'model', parts: [{ text: response.text }] });
      appendMessage('ai', response.text);
    } else {
      appendMessage('ai', "Sem resposta da IA. Tente novamente.");
    }

  } catch (error) {
    console.error(error);
    typingIndicator.classList.add('hidden');
    conversationHistory.pop();
    appendMessage('ai', `⚠️ ERRO: ${error.message || JSON.stringify(error)}`);
  }
});
  
