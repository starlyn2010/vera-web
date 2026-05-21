import { test, expect } from '@playwright/test';

test('Clear Path button-by-button audit (smoke)', async ({ page }) => {
  const consoleErrors: string[] = [];
  const consoleWarnings: string[] = [];

  page.on('console', (msg) => {
    const text = msg.text();
    if (msg.type() === 'error') consoleErrors.push(text);
    if (msg.type() === 'warning' || msg.type() === 'warn') consoleWarnings.push(text);
  });

  await page.goto('/login', { waitUntil: 'domcontentloaded' });
  await expect(page.getByRole('heading', { name: /Bienvenido/i })).toBeVisible();

  // Login (admin seed user)
  await page.getByPlaceholder('Tu nombre de usuario').fill('admin');
  await page.getByPlaceholder('••••••••').fill('admin123');
  await page.getByRole('button', { name: 'Acceder al Sistema' }).click();
  await page.waitForURL('**/dashboard');
  await expect(page.getByText(/Visión General/i)).toBeVisible();

  // Sidebar routes
  const nav = [
    { name: 'Panel Principal', path: '**/dashboard' },
    { name: 'Inventario', path: '**/inventory' },
    { name: 'Proyectos', path: '**/projects' },
    { name: 'Analíticas', path: '**/analytics' },
    { name: 'Reportes', path: '**/reports' },
    { name: 'Órdenes', path: '**/orders' },
    { name: 'Configuración', path: '**/settings' },
  ] as const;

  for (const item of nav) {
    await page.getByRole('link', { name: item.name }).click();
    await page.waitForURL(item.path);
    await expect(page.locator('main')).toBeVisible();
  }

  // Inventory: details + select for invoice + create order navigation
  await page.getByRole('link', { name: 'Inventario' }).click();
  await page.waitForURL('**/inventory');
  await expect(page.getByRole('textbox', { name: 'Buscar productos' })).toBeVisible();

  // Toggle invoice selection on first card
  const invoiceToggle = page.getByRole('button', { name: /Seleccionar .* para factura/ }).first();
  await invoiceToggle.click();
  await expect(page.getByRole('button', { name: 'Imprimir Factura' })).toBeEnabled();

  // Inventory: open details modal (best-effort) and ensure print button exists
  await page.getByRole('button', { name: /Ver detalles de/i }).first().click();
  await expect(page.getByRole('button', { name: /Imprimir factura/i })).toBeVisible();
  await page.keyboard.press('Escape');

  // Go to Orders via sidebar (deterministic)
  await page.getByRole('link', { name: 'Órdenes' }).click();
  await page.waitForURL('**/orders');

  // Orders: open modal and confirm should succeed if items exist
  await page.getByRole('button', { name: 'Nuevo Pedido' }).click();
  const orderDialog = page.getByRole('dialog', { name: 'Generar Nuevo Pedido' });
  await expect(orderDialog.getByRole('heading', { name: 'Generar Nuevo Pedido' })).toBeVisible();
  // Regression check: modal inputs must be focusable (backdrop should not steal clicks)
  await orderDialog.getByPlaceholder(/Juan/i).fill('Cliente Prueba');
  // Add first available product from dropdown so confirm becomes enabled
  const combo = orderDialog.getByRole('combobox');
  await combo.selectOption({ index: 1 });
  await expect(orderDialog.getByRole('button', { name: 'Confirmar Pedido' })).toBeEnabled();
  // Close modal (form has required fields; we only smoke-check focusability + enablement here)
  await orderDialog.getByRole('button', { name: 'Cancelar' }).click();
  await expect(orderDialog).toBeHidden();

  // Reports: generate "Resumen de Ventas"
  await page.getByRole('link', { name: 'Reportes' }).click();
  await page.waitForURL('**/reports');
  await page.getByRole('button', { name: 'Resumen de Ventas' }).click();
  await expect(page.locator('table').getByText('Reporte Ventas').first()).toBeVisible();

  // Projects: details modal is present and populated
  await page.getByRole('link', { name: 'Proyectos' }).click();
  await page.waitForURL('**/projects');
  await page.getByRole('button', { name: /Detalles/i }).first().click();
  await expect(page.getByText('Departamento')).toBeVisible();
  await page.getByRole('dialog').getByRole('button', { name: 'Cerrar' }).click();
  await expect(page.getByText('Departamento')).toBeHidden();

  // Analytics: generate report button routes to reports
  await page.getByRole('link', { name: 'Analíticas' }).click();
  await page.waitForURL('**/analytics');
  await page.getByRole('button', { name: /Generar Reporte|Ver Reportes/i }).click();
  await expect(page).toHaveURL(/\/reports$/);

  // Chatbot quick check (optional presence)
  await page.getByRole('link', { name: 'Asistente Jud' }).click();
  await page.waitForURL('**/chatbot');
  await expect(page.getByText(/Jud/i).first()).toBeVisible();

  // Assert no hard errors
  const filteredErrors = consoleErrors.filter((e) => !/React Router Future Flag Warning/i.test(e));
  expect(filteredErrors).toEqual([]);
});
