DELETE FROM order_record
WHERE fan_project_id IN (1, 2, 3)
  AND sweetbook_order_uid LIKE 'demo-%';

DELETE FROM customer_order
WHERE fan_project_id IN (1, 2, 3)
  AND order_uid LIKE 'demo-order-%';

DELETE FROM fan_project
WHERE id IN (1, 2, 3);
