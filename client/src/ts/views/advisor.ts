import { api } from '../api.js';
import { marked } from 'marked';

export const renderAdvisor = async () => {
  const container = document.getElementById('page-container');
  if (!container) return;

  container.innerHTML = `
    <div class="page-header animate-in stagger-1">
      <div>
        <h2 class="page-title">AI Financial Advisor</h2>
        <p class="page-subtitle">Get personalized financial advice and literacy education.</p>
      </div>
      <button class="btn btn-ghost" id="btn-clear-chat">Clear History</button>
    </div>

    <div class="glass-card animate-in stagger-2" style="display: flex; flex-direction: column; height: calc(100vh - 200px); max-height: 700px; padding: 0; overflow: hidden; min-height: 400px;">
      
      <!-- Chat History -->
      <div id="chat-history" style="flex: 1; overflow-y: auto; padding: var(--space-md); display: flex; flex-direction: column; gap: var(--space-md);">
        <div class="empty-state">Loading chat...</div>
      </div>

      <!-- Chat Input -->
      <div style="padding: var(--space-md); border-top: 1px solid var(--border-subtle); background: var(--bg-surface);">
        <form id="chat-form" style="display: flex; gap: var(--space-sm); flex-wrap: wrap;">
          <input type="text" id="chat-input" class="form-input" style="flex: 1; min-width: 200px;" placeholder="Ask about budgets, investing..." required autocomplete="off">
          <button type="submit" class="btn btn-primary" id="btn-send-chat" style="flex-shrink: 0;">Send 🚀</button>
        </form>
      </div>
    </div>
  `;

  const chatHistoryEl = document.getElementById('chat-history');

  const appendMessage = async (role: string, content: string) => {
    if (!chatHistoryEl) return;
    
    // Remove empty state if present
    const emptyState = chatHistoryEl.querySelector('.empty-state');
    if (emptyState) emptyState.remove();

    const isUser = role === 'user';
    const msgEl = document.createElement('div');
    msgEl.style.display = 'flex';
    msgEl.style.flexDirection = 'column';
    msgEl.style.alignItems = isUser ? 'flex-end' : 'flex-start';
    msgEl.style.maxWidth = '95%';
    msgEl.style.alignSelf = isUser ? 'flex-end' : 'flex-start';
    msgEl.style.animation = 'slideUp 0.3s ease';

    const bubble = document.createElement('div');
    bubble.style.padding = 'var(--space-md)';
    bubble.style.border = '1px solid var(--border-light)';
    bubble.style.background = isUser ? 'var(--text-primary)' : 'var(--bg-surface)';
    bubble.style.color = isUser ? 'var(--bg-deep)' : 'var(--text-primary)';
    bubble.style.lineHeight = '1.6';
    
    // Parse Markdown safely
    try {
      const parsed = await marked.parse(content, { breaks: true });
      bubble.innerHTML = parsed;
    } catch {
      bubble.textContent = content;
    }
    
    // Quick fix for markdown p tags margins inside chat bubbles
    Array.from(bubble.getElementsByTagName('p')).forEach(p => {
      p.style.margin = '0 0 8px 0';
      p.style.wordBreak = 'break-word';
    });
    const lastP = bubble.querySelector('p:last-child');
    if (lastP) (lastP as HTMLElement).style.margin = '0';

    const avatar = document.createElement('div');
    avatar.style.fontSize = 'var(--font-xs)';
    avatar.style.color = 'var(--text-muted)';
    avatar.style.marginTop = 'var(--space-xs)';
    avatar.textContent = isUser ? 'You' : 'AI Advisor';

    msgEl.appendChild(bubble);
    msgEl.appendChild(avatar);
    chatHistoryEl.appendChild(msgEl);
    
    // Scroll to bottom
    chatHistoryEl.scrollTop = chatHistoryEl.scrollHeight;
  };

  const loadChatHistory = async () => {
    try {
      const history = await api.getChatHistory();
      if (chatHistoryEl) chatHistoryEl.innerHTML = '';
      
      if (history.length === 0) {
        if (chatHistoryEl) {
          chatHistoryEl.innerHTML = `
            <div class="empty-state" style="margin: auto;">
              <div class="empty-state-icon">🤖</div>
              <div class="empty-state-text">Hello! I'm your AI Financial Advisor.</div>
              <p style="color: var(--text-muted);">Ask me anything about your finances or financial planning.</p>
            </div>
          `;
        }
        return;
      }

      for (const msg of history) {
        await appendMessage(msg.role, msg.content);
      }
    } catch (err) {
      console.error(err);
      if (chatHistoryEl) chatHistoryEl.innerHTML = '<div class="empty-state" style="color: var(--color-danger);">Failed to load chat history.</div>';
    }
  };

  document.getElementById('chat-form')?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const input = document.getElementById('chat-input') as HTMLInputElement;
    const btn = document.getElementById('btn-send-chat') as HTMLButtonElement;
    const message = input.value.trim();
    if (!message) return;

    input.value = '';
    btn.disabled = true;
    appendMessage('user', message);

    try {
      const response = await api.sendMessage(message);
      // Server returns { role: 'advisor', content: '...' }
      appendMessage('advisor', response.content);
    } catch (err) {
      appendMessage('assistant', 'Sorry, I encountered an error while processing your request.');
    } finally {
      btn.disabled = false;
      input.focus();
    }
  });

  document.getElementById('btn-clear-chat')?.addEventListener('click', async () => {
    if (confirm('Are you sure you want to clear your chat history?')) {
      try {
        await api.clearChatHistory();
        loadChatHistory();
      } catch (err) {
        console.error(err);
      }
    }
  });

  loadChatHistory();
};
