-- Fix staff_wallet foreign key constraints to cascade on user/wallet delete.
-- The previous migration used ON DELETE RESTRICT, which prevented user deletion
-- when a staff wallet record existed.

ALTER TABLE staff_wallet_transactions
  DROP CONSTRAINT staff_wallet_transactions_wallet_id_fkey,
  ADD CONSTRAINT staff_wallet_transactions_wallet_id_fkey
    FOREIGN KEY (wallet_id) REFERENCES staff_wallets(id) ON DELETE CASCADE;

ALTER TABLE staff_wallets
  DROP CONSTRAINT staff_wallets_user_id_fkey,
  ADD CONSTRAINT staff_wallets_user_id_fkey
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE;
