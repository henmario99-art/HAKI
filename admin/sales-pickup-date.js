// HAKI Ventas: la única fecha operativa es el día en que el cliente retira.
(() => {
  openNewSale = function(date = addDays(state.weekStart, 0)) {
    resetForm();
    $('#salePickupDate').value = date;
    addItemRow();
    $('#saleDialog').showModal();
  };

  openEditSale = function(sale) {
    resetForm();
    state.editing = sale;
    // La venta todavía vive en la semana donde fue guardada originalmente.
    state.previousWeekStart = mondayOf(sale.fecha);
    $('#saleDialogTitle').textContent = 'Editar venta';
    $('#deleteSale').hidden = false;
    $('#saleChannel').value = sale.canal || 'Instagram';
    $('#salePickupDate').value = sale.fechaRetiro || sale.fecha || '';
    $('#saleClient').value = sale.cliente || '';
    $('#salePlace').value = sale.lugarHorario || '';
    $('#saleShipping').value = Number(sale.envio) || 0;
    $('#saleDelivery').value = sale.entrega || 'Pedido Express';
    $('#saleState').value = sale.estado || 'Pendiente';
    $('#saleMoney').value = sale.dinero || 'Pendiente';
    $('#saleNotes').value = sale.notas || '';
    (sale.items || []).forEach(addItemRow);
    if (!sale.items?.length) addItemRow();
    updateTotals();
    $('#saleDialog').showModal();
  };

  formSale = function() {
    const pickupDate = $('#salePickupDate').value;
    const items = $$('.item-row', $('#items')).map(row => {
      const product = state.products.find(p => String(p.id) === $('[data-item="product"]', row).value);
      return {
        productId: product?.id,
        codigo: product?.codigo,
        nombre: product?.nombre,
        talla: $('[data-item="size"]', row).value,
        cantidad: Number($('[data-item="qty"]', row).value) || 1,
        precio: Number($('[data-item="price"]', row).value) || 0,
      };
    });

    return {
      id: state.editing?.id,
      // Se usa la fecha de retiro para ubicar la venta en su semana de 7 días.
      fecha: pickupDate,
      fechaRetiro: pickupDate,
      canal: $('#saleChannel').value,
      cliente: $('#saleClient').value,
      lugarHorario: $('#salePlace').value,
      items,
      envio: Number($('#saleShipping').value) || 0,
      entrega: $('#saleDelivery').value,
      estado: $('#saleState').value,
      dinero: $('#saleMoney').value,
      notas: $('#saleNotes').value,
    };
  };
})();
