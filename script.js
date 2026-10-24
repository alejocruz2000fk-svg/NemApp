import { GoogleGenAI } from "@google/genai";

const welcomeScreen = document.getElementById('welcome-screen');
const chatScreen = document.getElementById('chat-screen');
const btnYes = document.getElementById('btn-yes');
const btnNo = document.getElementById('btn-no');
const chatMessages = document.getElementById('chat-messages');
const chatForm = document.getElementById('chat-form');
const userInput = document.getElementById('user-input');
const apiKeyInput = document.getElementById('api-key-input');
const typingIndicator = document.getElementById('typing-indicator');

let chatSession = null;

// Botão "Não"
btnNo?.addEventListener('click', () => {
  welcomeScreen.innerHTML = `
    <div class="py-4">
      <h2 class="text-xl font-bold text-slate-200 mb-2">Tá bom! 👍</h2>
      <p class="text-slate-400">Se mudar de ideia, basta recarregar a página.</p>
    </div>
  `;
});

// Botão "Sim"
btnYes?.addEventListener('click', () => {
  welcomeScreen.classList.add('hidden');
  chatScreen.classList.remove('hidden');
});

// Adicionar mensagem na tela
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

// Enviar mensagem para o Gemini
chatForm.addEventListener('submit', async (e) => {
  e.preventDefault();
  const text = userInput.value.trim();
  if (!text) return;

  const apiKey = apiKeyInput.value.trim();
  if (!apiKey) {
    alert("Por favor, cole sua Gemini API Key no campo superior direito.");
    return;
  }

  appendMessage('user', text);
  userInput.value = '';
  typingIndicator.classList.remove('hidden');

  try {
    if (!chatSession) {
      const ai = new GoogleGenAI({ apiKey });
      chatSession = ai.chats.create({
        model: "gemini-2.5-flash",
        config: {
          systemInstruction: "Você é um assistente virtual amigável em um aplicativo web. Responda de forma clara e direta."
        }
      });
    }

    const response = await chatSession.sendMessage({ message: text });
    typingIndicator.classList.add('hidden');
    
    if (response && response.text) {
      appendMessage('ai', response.text);
    } else {
      appendMessage('ai', "Sem resposta da IA. Tente novamente.");
    }

  } catch (error) {
    console.error(error);
    typingIndicator.classList.add('hidden');
    chatSession = null; // Reseta a sessão em caso de erro na chave
    appendMessage('ai', "Erro ao conectar. Verifique se a sua API Key está correta e tente de novo.");
  }
});
