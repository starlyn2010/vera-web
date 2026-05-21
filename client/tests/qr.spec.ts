import { test, expect } from '@playwright/test';

test('QR verification tokens are compact and verifiable (invoice + report)', async ({ request }) => {
  const loginRes = await request.post('/api/auth/login', {
    data: { nombre_usuario: 'admin', password: 'admin123' },
  });
  expect(loginRes.ok()).toBeTruthy();

  const login = await loginRes.json();
  const token = login.token as string;
  expect(typeof token).toBe('string');
  expect(token.length).toBeGreaterThan(20);

  const headers = { Authorization: `Bearer ${token}` };

  const invRes = await request.get('/api/inventory', { headers });
  expect(invRes.ok()).toBeTruthy();
  const inventory = (await invRes.json()) as any[];
  expect(Array.isArray(inventory)).toBeTruthy();
  expect(inventory.length).toBeGreaterThan(0);

  const first = inventory[0];
  expect(first?.id_producto).toBeTruthy();

  const createOrderRes = await request.post('/api/orders', {
    headers,
    data: {
      productos: [{ id_producto: first.id_producto, cantidad: 1 }],
      tarjeta: '4111 1111 1111 1111',
      numero_telefono: '+1 (555) 000-0000',
    },
  });
  expect(createOrderRes.ok()).toBeTruthy();
  const createOrder = await createOrderRes.json();
  expect(createOrder?.id_pedido).toBeTruthy();

  const orderDetailsRes = await request.get(`/api/orders/${createOrder.id_pedido}`, { headers });
  expect(orderDetailsRes.ok()).toBeTruthy();
  const orderDetails = await orderDetailsRes.json();
  const invoiceToken = String(orderDetails?.verifyToken || '');
  expect(invoiceToken.length).toBeGreaterThan(40);
  // Compact enough to scan reliably from PDFs without extreme zoom.
  expect(invoiceToken.length).toBeLessThan(650);

  const invoiceVerifyRes = await request.get(`/api/verify/token/${encodeURIComponent(invoiceToken)}`);
  expect(invoiceVerifyRes.ok()).toBeTruthy();
  const invoiceVerify = await invoiceVerifyRes.json();
  expect(invoiceVerify?.tipo).toBe('invoice');
  expect(Array.isArray(invoiceVerify?.payload?.items)).toBeTruthy();

  const reportRes = await request.post('/api/reports/generate', {
    headers,
    data: { tipo: 'Ventas', periodo: 'Mayo 2026' },
  });
  expect(reportRes.ok()).toBeTruthy();
  const report = await reportRes.json();
  const reportToken = String(report?.verifyToken || '');
  expect(reportToken.length).toBeGreaterThan(40);
  expect(reportToken.length).toBeLessThan(650);

  const reportVerifyRes = await request.get(`/api/verify/token/${encodeURIComponent(reportToken)}`);
  expect(reportVerifyRes.ok()).toBeTruthy();
  const reportVerify = await reportVerifyRes.json();
  expect(reportVerify?.tipo).toBe('report');
  expect(String(reportVerify?.payload?.summary || '').length).toBeLessThan(300);
});

