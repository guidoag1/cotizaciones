let itemCount = 1;
let catalogo = JSON.parse(localStorage.getItem('catalogo')) || [];
let tabActiva = 'cotizacion';
const GOOGLE_SHEETS_URL = 'https://script.google.com/macros/s/AKfycbwTqwqSOt9pf1F46dTfitYS49bfUGvbWKLbbos0eM_sjy16f17xkcL1O2pRVW75RbCP/exec';

document.addEventListener('DOMContentLoaded', function() {
    document.getElementById('fecha').valueAsDate = new Date();
    document.getElementById('numeroCot').value = 'COT-' + Date.now().toString().slice(-6);
    cargarCatalogo();
    updateTotals();
    
    // Event listeners
    document.getElementById('addItemBtn').onclick = addItemManual;
    document.getElementById('addFromCatalogo').onclick = () => showTab('catalogo');
    document.getElementById('generarPDF').onclick = generarPDF;
    document.getElementById('limpiar').onclick = limpiarTodo;
    document.getElementById('guardarCatalogo').onclick = guardarItemEnCatalogo;
    document.getElementById('nuevoArticulo').onclick = mostrarFormNuevo;
    document.getElementById('guardarArticulo').onclick = guardarNuevoArticulo;
    document.getElementById('cancelarArticulo').onclick = ocultarFormNuevo;
    document.getElementById('buscarArticulo').oninput = filtrarCatalogo;
    
    // Delete items
    document.addEventListener('click', function(e) {
        if (e.target.classList.contains('delete')) {
            e.target.closest('.item-row').remove();
            updateTotals();
        }
    });
});

function showTab(tab) {
    document.querySelectorAll('.tab-content').forEach(t => t.classList.remove('active'));
    document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
    document.getElementById(tab).classList.add('active');
    event.target.classList.add('active');
    tabActiva = tab;
}

function addItemManual() {
    const items = document.getElementById('items');
    const newItem = document.querySelector('.item-row').cloneNode(true);
    newItem.querySelector('.desc').value = '';
    newItem.querySelector('.cant').value = '1';
    newItem.querySelector('.precio').value = '';
    newItem.querySelector('.total').textContent = '$0';
    newItem.querySelector('.delete').onclick = function() { this.closest('.item-row').remove(); updateTotals(); };
    items.appendChild(newItem);
    updateTotals();
}

function cargarCatalogo() {
    const lista = document.getElementById('listaArticulos');
    lista.innerHTML = '';
    
    catalogo.forEach((articulo, index) => {
        const card = document.createElement('div');
        card.className = 'articulo-card';
        card.innerHTML = `
            <div class="articulo-titulo">${articulo.descripcion}</div>
            <div class="articulo-precio">$${articulo.precio}</div>
            <div class="articulo-codigo">${articulo.codigo || 'Sin código'}</div>
            <button class="btn-agregar-cotizacion" onclick="agregarDesdeCatalogo(${index})">➕ Añadir a Cotización</button>
        `;
        lista.appendChild(card);
    });
}

function filtrarCatalogo() {
    const busqueda = document.getElementById('buscarArticulo').value.toLowerCase();
    const cards = document.querySelectorAll('.articulo-card');
    
    cards.forEach((card, index) => {
        const texto = card.textContent.toLowerCase();
        card.style.display = texto.includes(busqueda) ? 'block' : 'none';
    });
}

function agregarDesdeCatalogo(index) {
    const articulo = catalogo[index];
    addItemManual();
    const ultimaFila = document.querySelector('.item-row:last-child');
    ultimaFila.querySelector('.desc').value = articulo.descripcion;
    ultimaFila.querySelector('.precio').value = articulo.precio;
    ultimaFila.querySelector('.cant').value = '1';
    updateRowTotal(ultimaFila);
    updateTotals();
    showTab('cotizacion');
}

function mostrarFormNuevo() {
    document.getElementById('formNuevoArticulo').classList.remove('hidden');
}

function ocultarFormNuevo() {
    document.getElementById('formNuevoArticulo').classList.add('hidden');
    document.getElementById('nuevoDesc').value = '';
    document.getElementById('nuevoPrecio').value = '';
    document.getElementById('nuevoCodigo').value = '';
}

function guardarNuevoArticulo() {
    const nuevo = {
        descripcion: document.getElementById('nuevoDesc').value,
        precio: parseFloat(document.getElementById('nuevoPrecio').value),
        codigo: document.getElementById('nuevoCodigo').value
    };
    
    if (nuevo.descripcion && nuevo.precio) {
        catalogo.push(nuevo);
        localStorage.setItem('catalogo', JSON.stringify(catalogo));
        cargarCatalogo();
        ocultarFormNuevo();
        alert('✅ Artículo guardado en catálogo!');
    }
}

function guardarItemEnCatalogo() {
    const primeraFila = document.querySelector('.item-row');
    if (primeraFila && primeraFila.querySelector('.desc').value) {
        const nuevo = {
            descripcion: primeraFila.querySelector('.desc').value,
            precio: parseFloat(primeraFila.querySelector('.precio').value),
            codigo: `ART-${Date.now().toString().slice(-6)}`
        };
        catalogo.push(nuevo);
        localStorage.setItem('catalogo', JSON.stringify(catalogo));
        cargarCatalogo();
        alert('✅ Item guardado en catálogo!');
    }
}

function updateRowTotal(row) {
    const cant = parseFloat(row.querySelector('.cant').value) || 0;
    const precio = parseFloat(row.querySelector('.precio').value) || 0;
    const total = (cant * precio).toFixed(2);
    row.querySelector('.total').textContent = '$' + total;
}

function updateTotals() {
    let subtotal = 0;
    document.querySelectorAll('.item-row .total').forEach(total => {
        subtotal += parseFloat(total.textContent.replace('$', '')) || 0;
    });
    
    const iva = (subtotal * 0.16).toFixed(2);
    const descuento = 0;
    const totalFinal = (subtotal + parseFloat(iva) - descuento).toFixed(2);
    
    document.getElementById('subtotal').textContent = '$' + subtotal.toFixed(2);
    document.getElementById('iva').textContent = '$' + iva;
    document.getElementById('descuento').textContent = '$' + descuento.toFixed(2);
    document.getElementById('total').textContent = '$' + totalFinal;
}

function limpiarTodo() {
    document.querySelectorAll('#cotizacion input').forEach(input => {
        if (input.id !== 'fecha') input.value = '';
    });
    document.querySelectorAll('.item-row input').forEach(input => input.value = '');
    document.getElementById('fecha').valueAsDate = new Date();
    document.getElementById('numeroCot').value = 'COT-' + Date.now().toString().slice(-6);
    updateTotals();
}

// 🔥 PDF GENERADOR FUNCIONAL 100%
function generarPDF() {
    // Recopilar datos
    const cliente = document.getElementById('cliente').value || 'N/A';
    const email = document.getElementById('email').value || 'N/A';
    const fecha = document.getElementById('fecha').value;
    const numeroCot = document.getElementById('numeroCot').value || 'N/A';
    
    let itemsHTML = '';
    let subtotal = 0;
    
    document.querySelectorAll('.item-row').forEach(row => {
        const desc = row.querySelector('.desc').value;
        const cant = row.querySelector('.cant').value;
        const precio = row.querySelector('.precio').value;
        const total = row.querySelector('.total').textContent;
        
        if (desc.trim()) {
            itemsHTML += `
                <tr>
                    <td style="padding: 12px; border: 1px solid #ddd;">${desc}</td>
                    <td style="padding: 12px; border: 1px solid #ddd; text-align: center;">${cant}</td>
                    <td style="padding: 12px; border: 1px solid #ddd; text-align: right;">$${parseFloat(precio || 0).toFixed(2)}</td>
                    <td style="padding: 12px; border: 1px solid #ddd; text-align: right; font-weight: bold;">${total}</td>
                </tr>
            `;
            subtotal += parseFloat(total.replace('$', '')) || 0;
        }
    });
    
    const iva = (subtotal * 0.16).toFixed(2);
    const totalFinal = (subtotal + parseFloat(iva)).toFixed(2);
    
    // HTML del PDF
    const pdfHTML = `
    <!DOCTYPE html>
    <html>
    <head>
        <meta charset="UTF-8">
        <title>Cotización ${numeroCot}</title>
        <style>
            body { 
                font-family: 'Arial', sans-serif; 
                margin: 40px; 
                max-width: 800px; 
                line-height: 1.6;
                color: #333;
            }
            .header { 
                text-align: center; 
                border-bottom: 3px solid #667eea; 
                padding-bottom: 20px; 
                margin-bottom: 30px;
            }
            .header h1 { 
                color: #667eea; 
                margin: 0; 
                font-size: 28px;
            }
            .info { 
                display: grid; 
                grid-template-columns: 1fr 1fr; 
                gap: 40px; 
                margin: 30px 0;
            }
            .info div { background: #f8f9ff; padding: 20px; border-radius: 10px; }
            table { 
                width: 100%; 
                border-collapse: collapse; 
                margin: 30px 0;
                font-size: 14px;
            }
            th { 
                background: #667eea !important; 
                color: white; 
                padding: 15px; 
                text-align: left;
            }
            .totals { 
                margin-top: 30px; 
                font-size: 18px; 
                text-align: right;
            }
            .total-final { 
                font-size: 24px !important; 
                color: #2ed573 !important; 
                font-weight: bold;
                border-top: 3px solid #2ed573;
                padding-top: 10px;
            }
            .footer { 
                margin-top: 50px; 
                text-align: center; 
                font-size: 12px; 
                color: #666;
                border-top: 1px solid #eee;
                padding-top: 20px;
            }
            @media print { body { margin: 0; } }
        </style>
    </head>
    <body>
        <div class="header">
            <h1>📋 COTIZACIÓN</h1>
            <h2 style="color: #555; margin-top: 10px;">${numeroCot}</h2>
        </div>
        
        <div class="info">
            <div>
                <h3>👤 Cliente</h3>
                <p><strong>${cliente}</strong></p>
                <p>${email}</p>
            </div>
            <div>
                <h3>📅 Fecha</h3>
                <p>${new Date(fecha).toLocaleDateString('es-ES', { 
                    weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' 
                })}</p>
                <p><strong>Válida por 30 días</strong></p>
            </div>
        </div>
        
        <table>
            <thead>
                <tr>
                    <th style="width: 50%;">Descripción</th>
                    <th style="width: 15%;">Cantidad</th>
                    <th style="width: 15%;">Precio Unit.</th>
                    <th style="width: 20%;">Total</th>
                </tr>
            </thead>
            <tbody>${itemsHTML}</tbody>
        </table>
        
        <div class="totals">
            <div>Subtotal: $${subtotal.toFixed(2)}</div>
            <div>IVA (16%): $${iva}</div>
            <hr style="border: 1px solid #ddd;">
            <div class="total-final">TOTAL: $${totalFinal}</div>
        </div>
        
        <div class="footer">
            <p>💳 Condiciones: 50% anticipo, 50% entrega</p>
            <p>✉️ Contacto: tu-email@ejemplo.com | 📞 Tel: (123) 456-7890</p>
        </div>
    </body>
    </html>`;

    // ✅ GENERA PDF REAL
    const printWindow = window.open('', '_blank', 'width=900,height=650');
    printWindow.document.write(pdfHTML);
    printWindow.document.close();
    
    // Auto-imprime cuando cargue
    printWindow.onload = function() {
        printWindow.focus();
        printWindow.print();
        printWindow.close();
    };
    // 🔥 SYNCRONIZACIÓN GOOGLE SHEETS
async function cargarHistorial() {
    try {
        const response = await fetch(GOOGLE_SHEETS_URL);
        historial = await response.json();
        localStorage.setItem('historialCotizaciones', JSON.stringify(historial));
    } catch(e) {
        historial = JSON.parse(localStorage.getItem('historialCotizaciones')) || [];
    }
    mostrarHistorial();
}

async function guardarCotizacion() {
    const cotizacion = {
        id: Date.now(),
        numero: document.getElementById('numeroCot').value,
        cliente: document.getElementById('cliente').value,
        email: document.getElementById('email').value,
        fecha: document.getElementById('fecha').value,
        items: [],
        subtotal: document.getElementById('subtotal').textContent.replace('$', ''),
        iva: document.getElementById('iva').textContent.replace('$', ''),
        total: document.getElementById('total').textContent.replace('$', '')
    };
    
    document.querySelectorAll('.item-row').forEach(row => {
        const desc = row.querySelector('.desc').value;
        if (desc.trim()) {
            cotizacion.items.push({
                desc, cant: row.querySelector('.cant').value,
                precio: row.querySelector('.precio').value,
                total: row.querySelector('.total').textContent
            });
        }
    });
    
    // 🔥 GUARDAR EN GOOGLE SHEETS
    await fetch(GOOGLE_SHEETS_URL, {
        method: 'POST',
        body: JSON.stringify({action: 'save', cotizacion})
    });
    
    historial.unshift(cotizacion);
    localStorage.setItem('historialCotizaciones', JSON.stringify(historial));
    cargarHistorial();
    alert(`✅ Guardada en Google Sheets!`);
}

async function eliminarCotizacion(index) {
    if (confirm('¿Eliminar de Google Sheets?')) {
        await fetch(GOOGLE_SHEETS_URL, {
            method: 'POST',
            body: JSON.stringify({action: 'delete', id: historial[index].id})
        });
        historial.splice(index, 1);
        localStorage.setItem('historialCotizaciones', JSON.stringify(historial));
        cargarHistorial();
    }
}

// Auto-sync cada 30s
setInterval(cargarHistorial, 30000);
}
