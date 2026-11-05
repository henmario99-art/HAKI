# Seguimiento diario de Netlify

## Acceso y alcance

- Equipo: henmario99. Proyecto de interés: haki-sv; catálogo https://haki-sv.netlify.app/.
- Saldo y categorías: https://app.netlify.com/teams/henmario99/billing/general#credit-balance
- Gráfico diario: https://app.netlify.com/teams/henmario99/billing/usage#credits
- Zona de los informes al usuario: America/El_Salvador. No asumir que el día del gráfico usa esa zona: conservar su fecha y zona declaradas; si no se indica zona, decirlo.
- Descubrir primero una conexión disponible que pueda leer estas métricas. Si no existe, usar el navegador conectado con la sesión del usuario. No crear tokens, cambiar permisos ni extraer cookies.
- Confirmar equipo, proyecto, plan y ciclo en cada ejecución. Los créditos del equipo son compartidos: si hay varios proyectos, no atribuir el total a HAKI. Solo presentar cifras exclusivas de haki-sv si Netlify muestra ese alcance.

## Una lectura diaria

1. Leer fecha/hora de captura y, si está disponible, de actualización del proveedor. Registrar inicio y fin del ciclo tal como figuran, créditos incluidos, saldo total disponible y cada bolsa con saldo, vencimiento y procedencia. Mantener separadas las bolsas mensuales de las adicionales. Leer auto recarga sin modificarla.
2. Recoger el total de créditos consumidos que Netlify informa y su desglose: deploys de producción, ancho de banda, peticiones web, cómputo e IA. Conservar unidades y precisión. No confundir minutos de builds con deploys de producción facturados.
3. Abrir Account usage insights > Credits, seleccionar el ciclo actual y leer los días del gráfico con todas las series activas. Los valores accesibles del gráfico y sus etiquetas de fecha son evidencia válida; no consultar estado interno de la aplicación. Conservar cantidades como «< 0.01» y marcar sumas aproximadas. Un día ausente o incompleto es desconocido, nunca cero. No llamar «ayer» a un día de otra fecha o zona.
4. Conservar por separado: a) saldo y reducción de cada bolsa; b) total y categorías de consumo informadas; c) cifras por día. Si no coinciden, registrar discrepancia y posible retraso; no inventar equivalencias, aplicar un descuento supuesto ni ajustar datos para cuadrarlos. Las categorías pueden redondearse.
5. Comparar con el resultado anterior de la tarea. Una diferencia de acumulados solo representa consumo entre dos capturas comparables del mismo equipo, alcance, ciclo, unidad y método; indicar el intervalo real. Para diferencias de saldo, comprobar bolsas, concesiones, compras, vencimientos, reinicio y ajustes. Si no se pueden comprobar movimientos, llamarlo «cambio neto del saldo», no consumo diario. Nunca usar un descenso de consumo acumulado como consumo negativo.
6. En el primer registro, guardar línea base y usar solo los días que Netlify publique; no inventar 24 horas de consumo. En ciclos nuevos, iniciar una nueva serie. Conservar el resultado estructurado en el historial privado de la tarea y compararlo con la siguiente ejecución. Si el anterior no está accesible, declarar falta de comparación; no reconstruirla de memoria ni publicar el historial en GitHub o en el paquete.
7. Calcular previsión solo con datos comparables, intervalo conocido y sin movimientos de crédito sin explicar. Preferir los últimos siete días completos; con menos datos marcar estimación inicial. Si saldo y consumo no se reconcilian o los reportes están retrasados, presentar las lecturas como provisionales y suspender una fecha exacta de agotamiento. No sumar créditos que vencerán antes del horizonte proyectado.
8. Para alertas del presupuesto mensual, usar el porcentaje verificado de bolsa mensual agotada; marcar 60/75/85 % y señalar previsión de agotamiento antes del cierre si los datos lo permiten. Con discrepancias, separar advertencia de calidad de datos y riesgo verificado; evitar alertas numéricas falsamente precisas. Destacar un salto diario mayor al doble de la mediana de los últimos siete días completos cuando existan al menos tres comparables; separar despliegues del tráfico.
9. Entregar en español un resumen breve diario: fecha/alcance y día realmente publicado, consumo por día o intervalo verificable, saldo mensual y adicional, categoría dominante, estado del presupuesto/previsión y cualquier retraso o falta de acceso. Una tabla pequeña es suficiente. Mantener los registros privados sin datos de facturación personal, tarjetas, tokens o compradores.

## Ejecución programada

Crear o actualizar únicamente la tarea de consumo Netlify que el usuario haya pedido, sin duplicados. No cambiar las tareas de Supabase, historias o disponibilidad. El paquete enseña la revisión; programarla requiere una tarea activa independiente. Verificar acceso actual antes de programar y confirmar por separado el guardado del complemento y la activación de la tarea.

Si se pierde acceso, informar «no se pudo medir» y la última lectura con su antigüedad. Nunca presentar la línea base como actual ni asegurar seguimiento completo cuando el equipo o la sesión no estén disponibles.

## Evitar consumo y cambios involuntarios

No generar deploys, pruebas de carga, descargas de fotos ni recorridos del catálogo para medir facturación. No escanear logs salvo incidente confirmado y dentro del límite del procedimiento general. No cambiar plan, auto recarga, pagos, créditos, pausas ni límites. Proponer correcciones de consumo según la categoría dominante y preparar cambios en una rama; publicar solo con autorización.

## Referencias oficiales

Verificadas como fuentes el 5 de noviembre de 2026; revalidar ante cambios de plan o facturación:
- https://docs.netlify.com/manage/accounts-and-billing/billing/billing-for-credit-based-plans/monitor-usage-for-credit-based-plans/
- https://docs.netlify.com/manage/accounts-and-billing/billing/billing-for-credit-based-plans/how-credits-work/
