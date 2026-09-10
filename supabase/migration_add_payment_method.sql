ALTER TABLE service_requests
ADD COLUMN IF NOT EXISTS payment_method TEXT DEFAULT 'CASH';

COMMENT ON COLUMN service_requests.payment_method IS 'Método de pago seleccionado por el admin al aprobar el servicio';
