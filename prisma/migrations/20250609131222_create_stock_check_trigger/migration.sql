-- migration.sql

-- First, create a function that will be executed by the trigger.
-- This function checks if the new "inStock" value is negative.
-- If it is, it raises an error, which cancels the entire transaction.
CREATE OR REPLACE FUNCTION check_stock_non_negative()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW."inStock" < 0 THEN
    RAISE EXCEPTION 'Insufficient stock. Cannot complete the operation.';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Second, create the trigger itself.
-- This trigger is attached to the "InventoryItem" table.
-- It will automatically run the "check_stock_non_negative" function
-- BEFORE any row in the table is updated.
CREATE TRIGGER stock_update_trigger
BEFORE UPDATE ON "InventoryItem"
FOR EACH ROW
EXECUTE FUNCTION check_stock_non_negative();