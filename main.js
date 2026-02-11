import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js/+esm';

//  VERIFICAÇÃO DE SEGURANÇA 
if (!window.CONFIG) {
    console.error("ERRO CRÍTICO: Arquivo config.js não foi carregado ou está configurado errado.");
    alert("Erro no sistema. Contate o administrador.");
}

//  CONFIGURAÇÃO (Lendo do arquivo externo)
const supabase = createClient(window.CONFIG.SUPABASE_URL, window.CONFIG.SUPABASE_KEY);
const PIX_PAYLOAD = window.CONFIG.PIX_KEY;

// inicio
document.addEventListener('DOMContentLoaded', () => {
  carregarPresentes();
});

async function carregarPresentes() {
  const container = document.getElementById('lista-presentes');
  
  if (!container) {
    console.error('Elemento #lista-presentes não encontrado!');
    return;
  }

  container.innerHTML = '<p style="text-align:center; width:100%">Carregando lista de sonhos...</p>';

  const { data, error } = await supabase
    .from('presentes')
    .select('*')
    .order('id', { ascending: true });

  if (error) {
    console.error('Erro:', error.message);
    container.innerHTML = '<p>Erro ao carregar. Atualize a página.</p>';
    return;
  }

  renderizarPresentes(data);
}

function renderizarPresentes(presentes) {
  const container = document.getElementById('lista-presentes');
  container.innerHTML = '';

  presentes.forEach(p => {
    
    // BLOQUEIO TEMPORAL (Lua de Mel)
    const isLuaDeMel = p.nome_item.toLowerCase().includes('lua de mel');
    
    // Ajuste aqui a data se precisar
    const dataLiberacao = new Date('2026-03-16T00:00:00'); 
    
    const hoje = new Date();

    if (isLuaDeMel && hoje < dataLiberacao) {
        return; 
    }

    const isIlimitado = p.total_cotas >= 1000;
    const isCota = p.total_cotas > 1;
    const cotasRestantes = Math.max(0, p.total_cotas - p.cotas_vendidas);
    const esgotado = isIlimitado ? false : (cotasRestantes === 0);
    const porcentagem = p.total_cotas > 0 ? (p.cotas_vendidas / p.total_cotas) * 100 : 0;
    
    // CÁLCULO DO PREÇO UNITÁRIO 
    let precoUnitario;
    if (isIlimitado) {
        precoUnitario = p.preco / p.total_cotas; 
    } else if (isCota) {
        precoUnitario = Math.ceil(p.preco / p.total_cotas);
    } else {
        precoUnitario = Math.ceil(p.preco);
    }

    let labelBotao = 'PRESENTEAR';
    if (esgotado) labelBotao = 'ESGOTADO';
    else if (isIlimitado) labelBotao = 'QUERO CONTRIBUIR';
    else if (isCota) labelBotao = 'CONTRIBUA';
    
    const fmt = (valor) => valor.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
    
    let htmlPreco;
    if (isIlimitado) {
        htmlPreco = `
            <div style="display: flex; flex-direction: column; gap: 4px;">
                <span style="font-size: 0.85rem; color: #888; font-weight: 400;">Contribuição sugerida</span>
                <span style="font-size: 1.2rem; color: #d4a373; font-weight: 700;">Cotas de ${fmt(precoUnitario)}</span>
            </div>`;
    } else if (isCota) {
        const totalAprox = Math.ceil(p.preco);
        htmlPreco = `
            <div style="display: flex; flex-direction: column; gap: 4px;">
                <span style="font-size: 0.85rem; color: #888; font-weight: 400;">Total aprox: ${fmt(totalAprox)}</span>
                <span style="font-size: 1.2rem; color: #d4a373; font-weight: 700;">1 cota por ${fmt(precoUnitario)}</span>
            </div>`;
    } else {
        htmlPreco = `<span style="font-size: 1.2rem; font-weight: 700; color: #333;">${fmt(precoUnitario)}</span>`; 
    }

    const linkQrCode = `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(PIX_PAYLOAD)}`;
    const imagemSrc = p.imagem_url ? p.imagem_url : 'https://placehold.co/600x400/png?text=Presente';

    const div = document.createElement('div');
    div.className = 'card';
    
    if (isIlimitado) div.classList.add('card-destaque'); 
    if (esgotado) div.classList.add('esgotado');

    div.innerHTML = `
      <img src="${imagemSrc}" alt="${p.nome_item}" />
      <h3>${p.nome_item}</h3>
      <div class="descricao">${isIlimitado ? 'Ajude a tornar nossa viagem inesquecível!' : (isCota ? 'Ajude a completar este sonho!' : 'Presente especial')}</div>
      
      <div class="preco" style="min-height: 50px; display: flex; align-items: center; justify-content: center;">
        ${htmlPreco}
      </div>

      <button class="btn-acao btn-abrir" ${esgotado ? 'disabled' : ''} data-id="${p.id}">
        ${labelBotao}
      </button>

      ${isCota && !isIlimitado ? `
        <div class="progress"><div class="bar" style="width:${porcentagem}%"></div></div>
        <div style="font-size:12px; color:#888; margin-top:5px;">${p.cotas_vendidas} de ${p.total_cotas} cotas vendidas</div>
      ` : ''}

      <div class="contribuicao" id="contrib-${p.id}">
        <div style="border-top:1px solid #eee; margin-top:15px; padding-top:15px;">
            <p class="pix-info">1. Pague via Pix (QR Code ou Copia e Cola):</p>
            <img class="qr-code" src="${linkQrCode}" alt="QR Code Pix" />
            
            <div style="display: flex; gap: 5px; margin-bottom: 20px;">
                <input type="text" value="${PIX_PAYLOAD}" readonly style="flex: 1; padding: 8px; border: 1px solid #ddd; border-radius: 4px; font-size: 11px; background: #f9f9f9; color: #555;">
                <button class="btn-copiar-pix" style="background: #333; color: #fff; border: none; padding: 0 15px; border-radius: 4px; cursor: pointer; font-size: 12px; font-weight: 600;">COPIAR</button>
            </div>

            <p class="pix-info">2. Confirme os dados abaixo:</p>
            
            <label>${isIlimitado ? 'Quantas cotas de R$ 50?' : `Cotas (Máx: ${cotasRestantes})`}</label>
            
            <input type="number" 
                   id="qtd-${p.id}" 
                   class="input-cotas" 
                   data-id="${p.id}" 
                   data-preco="${precoUnitario}" 
                   min="1" 
                   max="${cotasRestantes}" 
                   value="1">
            
            <div id="feedback-valor-${p.id}" style="text-align: right; color: #052099; font-weight: 700; margin-bottom: 10px; font-size: 14px;">
                Total: ${fmt(precoUnitario)}
            </div>
            
            <label>Seu Nome</label>
            <input type="text" id="nome-${p.id}" placeholder="Opcional">
            
            <label>Mensagem</label>
            <input type="text" id="msg-${p.id}" placeholder="Opcional" maxlength="50">

            <button class="btn-acao btn-comprar" data-id="${p.id}">
              Confirmar gesto
            </button>
        </div>
      </div>
    `;

    container.appendChild(div);
  });
}


// --- INTERAÇÕES ---
document.addEventListener('click', async (e) => {
  // ABRIR CARD
  if (e.target.classList.contains('btn-abrir')) {
    const card = e.target.closest('.card');
    
    document.querySelectorAll('.card.aberto').forEach(c => {
      if (c !== card) c.classList.remove('aberto');
    });

    card.classList.toggle('aberto');
  }

  // COMPRAR
  if (e.target.classList.contains('btn-comprar')) {
    const btn = e.target;
    const id = Number(btn.dataset.id);
    const qtdInput = document.getElementById(`qtd-${id}`);
    const nomeInput = document.getElementById(`nome-${id}`);
    const msgInput = document.getElementById(`msg-${id}`);

    const qtd = Number(qtdInput.value);

    if (qtd < 1) {
      alert('Selecione pelo menos 1 cota.');
      return;
    }

    const textoOriginal = btn.innerText;
    btn.disabled = true;
    btn.innerText = 'Processando...';

    try {
      let userIp = 'anonimo';
      try {
        const ipRes = await fetch('https://api.ipify.org?format=json');
        const ipData = await ipRes.json();
        userIp = ipData.ip;
      } catch(e) { console.warn('Sem IP'); }

      const { error } = await supabase.rpc('comprar_cotas', {
        p_presente_id: id,
        p_quantidade: qtd,
        p_nome_convidado: nomeInput.value || '',
        p_mensagem: msgInput.value || '',
        p_ip: userIp
      });

      if (error) throw error;

      alert('Obrigado pelo presente! ❤️');
      
      const card = btn.closest('.card');
      card.classList.remove('aberto');
      carregarPresentes(); 

    } catch (err) {
      console.error(err);
      alert('Erro: ' + err.message);
    } finally {
      btn.disabled = false;
      btn.innerText = textoOriginal;
    }
  }

  // BOTÃO COPIAR PIX 
  if (e.target.classList.contains('btn-copiar-pix')) {
    const btn = e.target;
    
    navigator.clipboard.writeText(PIX_PAYLOAD).then(() => {
      const textoOriginal = btn.innerText;
      const corOriginal = btn.style.backgroundColor;

      btn.innerText = 'COPIADO!';
      btn.style.backgroundColor = '#27ae60';

      setTimeout(() => {
        btn.innerText = textoOriginal;
        btn.style.backgroundColor = corOriginal;
      }, 2000);
    }).catch(err => {
      console.error('Erro ao copiar:', err);
      alert('Não foi possível copiar automaticamente. Selecione o código manualmente.');
    });
  }
});


// --- CALCULADORA ---
document.addEventListener('input', (e) => {
  if (e.target.classList.contains('input-cotas')) {
    const input = e.target;
    const id = input.dataset.id;
    const precoUnitario = parseFloat(input.dataset.preco);
    const qtd = parseInt(input.value) || 0; 

    const total = qtd * precoUnitario;

    const feedback = document.getElementById(`feedback-valor-${id}`);
    if (feedback) {
      feedback.innerText = `Total: ${total.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}`;
    }
  }
});