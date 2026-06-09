import { useState, useEffect } from 'react';
import './index.css';

const VAT_RATE = 0.21;

function App() {
  const [activities, setActivities] = useState(() => {
    const saved = localStorage.getItem('nauticaActivities');
    return saved ? JSON.parse(saved) : [];
  });

  const [type, setType] = useState('clase');
  const [rentalType, setRentalType] = useState('kayak');
  const [people, setPeople] = useState(1);
  const [duration, setDuration] = useState('1h');
  const [amount, setAmount] = useState('');
  const [collector, setCollector] = useState('yo');
  const [paymentMethod, setPaymentMethod] = useState('efectivo');
  const [paymentDirection, setPaymentDirection] = useState('me_pagan'); // "me_pagan" o "yo_pago"
  const [notes, setNotes] = useState('');
  
  // Fecha por defecto: hoy (formato YYYY-MM-DD)
  const [activityDate, setActivityDate] = useState(() => new Date().toISOString().split('T')[0]);

  useEffect(() => {
    localStorage.setItem('nauticaActivities', JSON.stringify(activities));
  }, [activities]);

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!amount || isNaN(amount)) return;

    const newActivity = {
      id: Date.now(),
      date: activityDate,
      type,
      rentalType: type === 'alquiler' ? rentalType : null,
      people: type !== 'pago' ? people : null,
      duration: type !== 'pago' ? duration : null,
      amount: parseFloat(amount),
      collector: type !== 'pago' ? collector : null, 
      paymentMethod: type !== 'pago' ? paymentMethod : null,
      paymentDirection: type === 'pago' ? paymentDirection : null,
      notes
    };

    setActivities([newActivity, ...activities]);
    
    // Reset fields
    setAmount('');
    setNotes('');
  };

  const deleteActivity = (id) => {
    setActivities(activities.filter(a => a.id !== id));
  };

  const clearAll = () => {
    if (confirm('¿Estás seguro de que quieres borrar todos los registros? Asegúrate de haberlos exportado antes.')) {
      setActivities([]);
    }
  };

  // Calculations
  let totalBilled = 0;
  let totalMyEarnings = 0;
  let schoolOwesMe = 0;
  let iOweSchool = 0;

  let totalEfectivo = 0;
  let totalTarjeta = 0;
  let totalCobradoYo = 0;
  let totalCobradoEscuela = 0;
  let totalIvaMio = 0;
  let totalIvaEscuela = 0;

  activities.forEach(act => {
    const finalPrice = act.amount;

    if (act.type === 'pago') {
      if (act.paymentDirection === 'me_pagan') {
        // La escuela me da dinero a mí. Reduce lo que la escuela me debe.
        iOweSchool += finalPrice;
      } else {
        // Yo le doy dinero a la escuela. Reduce lo que yo le debo a la escuela.
        schoolOwesMe += finalPrice;
      }
      return; // Fin de cálculo para 'pago'
    }

    const basePrice = finalPrice / (1 + VAT_RATE);
    const vat = finalPrice - basePrice;
    
    const commissionRate = act.type === 'clase' ? 0.50 : 0.20;
    const myCommission = basePrice * commissionRate;
    
    let myEarnings = act.collector === 'yo' ? myCommission + vat : myCommission;
    
    totalBilled += finalPrice;
    totalMyEarnings += myEarnings;

    if (act.paymentMethod === 'efectivo') {
      totalEfectivo += finalPrice;
    } else {
      totalTarjeta += finalPrice;
    }
    
    if (act.collector === 'yo') {
      totalCobradoYo += finalPrice;
      totalIvaMio += vat;
      iOweSchool += (finalPrice - myEarnings);
    } else {
      totalCobradoEscuela += finalPrice;
      totalIvaEscuela += vat;
      schoolOwesMe += myEarnings;
    }
  });

  const netBalance = schoolOwesMe - iOweSchool;
  const isSchoolOweMe = netBalance > 0;
  const isIOweSchool = netBalance < 0;
  const balanceAmount = Math.abs(netBalance);

  const formatCurrency = (val) => new Intl.NumberFormat('es-ES', { style: 'currency', currency: 'EUR' }).format(val);

  const generateReportText = () => {
    const today = new Date().toLocaleDateString('es-ES');
    let text = `*Resumen Náutica - ${today}*\n\n`;
    text += `💰 *Total Facturado (Ventas):* ${formatCurrency(totalBilled)}\n`;
    text += `   💵 Efectivo: ${formatCurrency(totalEfectivo)}\n`;
    text += `   💳 Tarjeta: ${formatCurrency(totalTarjeta)}\n`;
    text += `🏢 *Cobrado por Escuela:* ${formatCurrency(totalCobradoEscuela)} (Retienen ${formatCurrency(totalIvaEscuela)} IVA)\n`;
    text += `🙋‍♂️ *Cobrado por Mí:* ${formatCurrency(totalCobradoYo)} (Retengo ${formatCurrency(totalIvaMio)} IVA)\n`;
    text += `👤 *Mis Ganancias:* ${formatCurrency(totalMyEarnings)}\n\n`;
    
    if (isIOweSchool) {
      text += `🚨 *BALANCE FINAL:* Te debo ${formatCurrency(balanceAmount)}\n\n`;
    } else if (isSchoolOweMe) {
      text += `✅ *BALANCE FINAL:* Me debes ${formatCurrency(balanceAmount)}\n\n`;
    } else {
      text += `⚖️ *BALANCE FINAL:* Estamos en paz (0€)\n\n`;
    }

    text += `*--- DETALLE DE REGISTROS ---*\n`;
    activities.forEach((act, i) => {
      if (act.type === 'pago') {
        const title = act.paymentDirection === 'me_pagan' ? 'La Escuela me paga a mí' : 'Yo le pago a la Escuela';
        text += `\n${activities.length - i}. 💸 Ajuste/Pago | ${formatCurrency(act.amount)}\n`;
        text += `   Tipo: ${title}\n`;
        if (act.notes) text += `   Nota: ${act.notes}\n`;
      } else {
        const icon = act.type === 'clase' ? '🚤' : (act.rentalType === 'kayak' ? '🛶' : '🏄');
        const title = act.type === 'clase' ? 'Clase/Tour' : `Alquiler ${act.rentalType}`;
        const methodIcon = act.paymentMethod === 'efectivo' ? '💵' : '💳';
        text += `\n${activities.length - i}. ${icon} ${title} | ${formatCurrency(act.amount)}\n`;
        text += `   Pax: ${act.people} | Dur: ${act.duration}\n`;
        text += `   Cobró y Factura: ${act.collector === 'yo' ? 'Yo' : 'Escuela'} | Pago: ${methodIcon} ${act.paymentMethod === 'efectivo' ? 'Efectivo' : 'Tarjeta'}\n`;
        if (act.notes) text += `   Nota: ${act.notes}\n`;
      }
    });

    return text;
  };

  const copyToClipboard = () => {
    const text = generateReportText();
    if (navigator.clipboard) {
      navigator.clipboard.writeText(text).then(() => {
        alert('Resumen copiado al portapapeles. ¡Listo para pegar en WhatsApp!');
      });
    } else {
      alert('Tu navegador no soporta copiado automático. Aquí tienes el texto:\n\n' + text);
    }
  };

  return (
    <>
      <div className="header-logo">
        <h1>🌊 Escuela Náutica</h1>
        <p style={{color: 'var(--text-muted)'}}>Control de Actividades y Comisiones</p>
      </div>

      <div className="glass-card">
        <h2>📝 Nuevo Registro</h2>
        <form onSubmit={handleSubmit} className="flex-col">
          
          <div>
            <label>Fecha</label>
            <input type="date" value={activityDate} onChange={e => setActivityDate(e.target.value)} required />
          </div>

          <div>
            <label>¿Qué quieres registrar?</label>
            <div className="segmented-control">
              <button 
                type="button" 
                className={type === 'clase' ? 'active' : ''} 
                onClick={() => setType('clase')}>
                🚤 Clase (50%)
              </button>
              <button 
                type="button" 
                className={type === 'pago' ? 'active' : ''} 
                onClick={() => setType('pago')}>
                💸 Ajuste/Pago
              </button>
            </div>
          </div>



          {type === 'pago' && (
            <div>
              <label>Dirección del Pago</label>
              <select value={paymentDirection} onChange={e => setPaymentDirection(e.target.value)}>
                <option value="me_pagan">📥 La Escuela me ha pagado a mí</option>
                <option value="yo_pago">📤 Yo le he pagado a la Escuela</option>
              </select>
            </div>
          )}

          {type !== 'pago' && (
            <div className="flex-row">
              <div style={{flex: 1}}>
                <label>Personas (Pax)</label>
                <input type="number" min="1" value={people} onChange={e => setPeople(e.target.value)} required />
              </div>
              <div style={{flex: 1}}>
                <label>Duración</label>
                <input type="text" placeholder="Ej: 1h, 30m" value={duration} onChange={e => setDuration(e.target.value)} required />
              </div>
            </div>
          )}

          <div>
            <label>{type === 'pago' ? 'Cantidad Pagada' : 'Importe Total (IVA Incluido)'}</label>
            <input type="number" step="0.01" min="0" placeholder="€" value={amount} onChange={e => setAmount(e.target.value)} required />
          </div>

          {type !== 'pago' && (
            <div className="flex-row">
              <div style={{flex: 1}}>
                <label>¿Quién Cobra y Factura?</label>
                <select value={collector} onChange={e => setCollector(e.target.value)}>
                  <option value="yo">Cobro Yo</option>
                  <option value="escuela">Cobra la Escuela</option>
                </select>
              </div>
              <div style={{flex: 1}}>
                <label>Método de Pago</label>
                <select value={paymentMethod} onChange={e => setPaymentMethod(e.target.value)}>
                  <option value="efectivo">💵 Efectivo</option>
                  <option value="tarjeta">💳 Tarjeta</option>
                </select>
              </div>
            </div>
          )}

          <div>
            <label>Notas (opcional)</label>
            <input type="text" placeholder={type === 'pago' ? 'Transferencia, bizum, efectivo...' : 'Nombre cliente, detalles...'} value={notes} onChange={e => setNotes(e.target.value)} />
          </div>

          <button type="submit" className="btn-primary mt-1">➕ Guardar {type === 'pago' ? 'Pago' : 'Actividad'}</button>
        </form>
      </div>

      <div className="glass-card">
        <h2>📊 Resumen del Día</h2>
          <div className="flex-row mt-2">
            <div className="stat-box">
              <div className="stat-value">{formatCurrency(totalBilled)}</div>
              <div className="stat-label">Caja Ventas</div>
            </div>
            <div className="stat-box" style={{background: 'rgba(0, 191, 165, 0.1)', borderColor: 'rgba(0, 191, 165, 0.3)'}}>
              <div className="stat-value text-success">{formatCurrency(totalMyEarnings)}</div>
              <div className="stat-label">Mis Ganancias</div>
            </div>
          </div>

          <div className="flex-row mt-2" style={{gap: '0.5rem'}}>
            <div className="stat-box" style={{padding: '0.75rem', background: 'rgba(0,0,0,0.02)'}}>
              <div className="stat-value" style={{fontSize: '1.2rem', color: 'var(--text-main)'}}>{formatCurrency(totalCobradoEscuela)}</div>
              <div className="stat-label">Físicamente en Escuela<br/>(+{formatCurrency(totalIvaEscuela)} IVA)</div>
            </div>
            <div className="stat-box" style={{padding: '0.75rem', background: 'rgba(0,0,0,0.02)'}}>
              <div className="stat-value" style={{fontSize: '1.2rem', color: 'var(--text-main)'}}>{formatCurrency(totalCobradoYo)}</div>
              <div className="stat-label">Físicamente en Mí<br/>(+{formatCurrency(totalIvaMio)} IVA)</div>
            </div>
          </div>

          <div className={`balance-card ${isIOweSchool ? 'owe-school' : isSchoolOweMe ? 'school-owes' : 'settled'}`}>
            <h3 style={{margin: 0, color: 'inherit'}}>
              {isIOweSchool ? '🚨 Tienes que darle a la Escuela' : 
               isSchoolOweMe ? '✅ La Escuela te tiene que dar' : 
               '⚖️ Balance saldado'}
            </h3>
            <div style={{fontSize: '2rem', fontWeight: '700', marginTop: '0.5rem', color: isIOweSchool ? 'var(--danger-color)' : isSchoolOweMe ? 'var(--success-color)' : 'var(--text-main)'}}>
              {formatCurrency(balanceAmount)}
            </div>
          </div>

          <button onClick={copyToClipboard} className="btn-secondary mt-3" style={{width: '100%'}}>
            📱 Copiar Resumen para WhatsApp
          </button>
        </div>

      {activities.length > 0 && (
        <div className="glass-card">
          <div className="flex-row space-between">
            <h2>⏱️ Historial ({activities.length})</h2>
            <button onClick={clearAll} className="btn-danger" style={{padding: '0.4rem 0.8rem', fontSize: '0.85rem'}}>Limpiar</button>
          </div>
          
          <div className="activity-list mt-2">
            {activities.map((act) => (
              <div key={act.id} className={`activity-item ${act.type === 'alquiler' ? 'rental' : ''}`}>
                <div className="activity-details">
                  {act.type === 'pago' ? (
                    <>
                      <h4>💸 Ajuste / Pago</h4>
                      <p>Fecha: <b>{new Date(act.date).toLocaleDateString('es-ES')}</b></p>
                      <p>Movimiento: <b>{act.paymentDirection === 'me_pagan' ? 'La Escuela me paga a mí' : 'Yo le pago a la Escuela'}</b></p>
                    </>
                  ) : (
                    <>
                      <h4>{act.type === 'clase' ? '🚤 Clase / Tour' : (act.rentalType === 'kayak' ? '🛶 Alquiler Kayak' : '🏄 Alquiler Paddle')}</h4>
                      <p>Fecha: <b>{new Date(act.date).toLocaleDateString('es-ES')}</b> | Pax: {act.people} | Dur: {act.duration}</p>
                      <p>Cobro: <b>{act.collector === 'yo' ? 'Yo' : 'Escuela'}</b> | Pago: <b>{act.paymentMethod === 'efectivo' ? 'Efectivo' : 'Tarjeta'}</b></p>
                    </>
                  )}
                  {act.notes && <p><i>Nota: {act.notes}</i></p>}
                </div>
                <div className="flex-col" style={{alignItems: 'flex-end', gap: '0.25rem'}}>
                  <div className="activity-amount">{formatCurrency(act.amount)}</div>
                  <button onClick={() => deleteActivity(act.id)} style={{background: 'transparent', color: 'var(--danger-color)', padding: 0, fontSize: '1.2rem'}} title="Eliminar">🗑️</button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </>
  );
}

export default App;
