import { api } from '../api.js';
import { marked } from 'marked';
import DOMPurify from 'dompurify';

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

    <div class="glass-card advisor-chat animate-in stagger-2">
      
      <!-- Chat History -->
      <div id="chat-history" class="advisor-chat-history">
        <div class="empty-state" style="margin: auto;">
          <div class="empty-state-icon">⏳</div>
          <div class="empty-state-text">Loading chat history...</div>
        </div>
      </div>

      <!-- Chat Input -->
      <div class="advisor-chat-composer">
        <form id="chat-form" class="advisor-chat-form">
          <input type="text" id="chat-input" class="form-input advisor-chat-input" placeholder="Ask about budgets, investing, savings goals... (Enter to send)" required autocomplete="off">
          <button type="submit" class="btn btn-primary advisor-chat-submit" id="btn-send-chat">Send 🚀</button>
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
    msgEl.style.maxWidth = '92%';
    msgEl.style.alignSelf = isUser ? 'flex-end' : 'flex-start';
    msgEl.style.animation = 'slideUp 0.3s ease';

    const bubble = document.createElement('div');
    bubble.style.padding = 'var(--space-md)';
    bubble.style.border = `1px solid ${isUser ? 'transparent' : 'var(--border-light)'}`;
    bubble.style.background = isUser ? 'var(--text-primary)' : 'var(--bg-surface)';
    bubble.style.color = isUser ? 'var(--bg-deep)' : 'var(--text-primary)';
    bubble.style.lineHeight = '1.6';
    // Visually differentiate user vs AI bubbles with asymmetric corners
    bubble.style.borderRadius = isUser ? '12px 12px 2px 12px' : '2px 12px 12px 12px';
    
    // Parse Markdown, then sanitize before inserting — content may originate
    // from user input or from the AI model, neither of which is trusted HTML.
    try {
      const parsed = await marked.parse(content, { breaks: true });
      bubble.innerHTML = DOMPurify.sanitize(parsed);
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
    avatar.textContent = isUser ? 'You' : '🤖 AI Advisor';

    msgEl.appendChild(bubble);
    msgEl.appendChild(avatar);
    chatHistoryEl.appendChild(msgEl);
    
    // Scroll to bottom
    chatHistoryEl.scrollTop = chatHistoryEl.scrollHeight;
  };

  const showTypingIndicator = () => {
    if (!chatHistoryEl) return null;
    const emptyState = chatHistoryEl.querySelector('.empty-state');
    if (emptyState) emptyState.remove();

    const indicator = document.createElement('div');
    indicator.id = 'typing-indicator';
    indicator.style.display = 'flex';
    indicator.style.alignItems = 'center';
    indicator.style.gap = 'var(--space-sm)';
    indicator.style.color = 'var(--text-muted)';
    indicator.style.fontSize = 'var(--font-sm)';
    indicator.style.animation = 'slideUp 0.3s ease';
    indicator.style.padding = 'var(--space-xs) 0';
    indicator.innerHTML = `
      <div style="display:inline-flex; gap: 5px; align-items: center; padding: 10px 14px; border-radius: 2px 12px 12px 12px; background: var(--bg-surface); border: 1px solid var(--border-light);">
        <span style="width:8px; height:8px; border-radius:50%; background:var(--text-muted); animation: dotPulse 1.2s ease infinite; display:inline-block;"></span>
        <span style="width:8px; height:8px; border-radius:50%; background:var(--text-muted); animation: dotPulse 1.2s ease infinite 0.3s; display:inline-block;"></span>
        <span style="width:8px; height:8px; border-radius:50%; background:var(--text-muted); animation: dotPulse 1.2s ease infinite 0.6s; display:inline-block;"></span>
      </div>
    `;
    chatHistoryEl.appendChild(indicator);
    chatHistoryEl.scrollTop = chatHistoryEl.scrollHeight;
    return indicator;
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
              <p style="color: var(--text-muted); margin-top: var(--space-sm);">Ask me anything about your finances — budgeting, debt payoff, investing, savings goals, and more.</p>
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
      if (chatHistoryEl) chatHistoryEl.innerHTML = '<div class="empty-state" style="color: var(--expense-color);">Failed to load chat history. Please refresh the page.</div>';
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
    btn.textContent = '...';
    await appendMessage('user', message);

    const typingIndicator = showTypingIndicator();

    try {
      const response = await api.sendMessage(message);
      typingIndicator?.remove();
      // Server returns { role: 'advisor', content: '...' }
      appendMessage('advisor', response.content);
    } catch (err) {
      typingIndicator?.remove();
      console.error(err);
      appendMessage('advisor', 'Sorry, I encountered an error while processing your request. Please try again.');
    } finally {
      btn.disabled = false;
      btn.textContent = 'Send 🚀';
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
