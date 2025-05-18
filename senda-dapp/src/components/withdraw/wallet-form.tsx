'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useWithdrawForm } from '@/stores/use-withdraw-form';
import { Wallet, ArrowLeft } from 'lucide-react';
import { motion } from 'framer-motion';

const WalletForm = () => {
  const { formData, setWalletAddress, nextStep, prevStep } = useWithdrawForm();
  const [address, setAddress] = useState(formData.walletAddress || '');
  const [error, setError] = useState<string | null>(null);

  const validateSolanaAddress = (address: string) => {
    // Basic Solana address validation - should be 44 characters long and only alphanumeric
    return /^[A-Za-z0-9]{43,44}$/.test(address);
  };

  const handleAddressChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setAddress(value);
    
    if (value && !validateSolanaAddress(value)) {
      setError('Please enter a valid Solana wallet address');
    } else {
      setError(null);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!address) {
      setError('Please enter a wallet address');
      return;
    }
    
    if (!validateSolanaAddress(address)) {
      setError('Please enter a valid Solana wallet address');
      return;
    }
    
    setWalletAddress(address);
    nextStep();
  };

  return (
    <motion.form
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      onSubmit={handleSubmit}
      className="space-y-8 max-w-2xl mx-auto"
    >
      <div className="text-center">
        <div className="inline-block bg-[#1c3144] p-4 rounded-2xl mb-6">
          <Wallet className="h-8 w-8 text-[#7ea16b]" />
        </div>
        <h2 className="text-2xl font-bold text-[#7ea16b] mb-3">Withdraw to Solana Wallet</h2>
        <p className="text-gray-600">Enter your Solana wallet address to receive the funds</p>
      </div>

      <div className="space-y-6">
        <div className="relative">
          <Input
            type="text"
            placeholder="Solana wallet address"
            value={address}
            onChange={handleAddressChange}
            className="w-full px-4 py-3 rounded-lg border-2 focus:border-[#7ea16b] 
                     transition-colors duration-200  border-[#d7dfbe] text-[#1c3144]"
          />
          {error && (
            <motion.p
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="absolute -bottom-6 left-0 text-sm text-[#7ea16b]"
            >
              {error}
            </motion.p>
          )}
        </div>

        <div className="bg-[#f6ead7]/30 rounded-xl p-4 border border-[#f6ead7]">
          <p className="text-sm text-[#1c3144]">
            Make sure to double-check the wallet address. Transactions cannot be reversed.
          </p>
        </div>
      </div>

      <div className="flex justify-between items-center pt-6">
        <Button
          type="button"
          variant="ghost"
          onClick={prevStep}
          className="text-gray-600 hover:text-gray-900 flex items-center gap-2"
        >
          <ArrowLeft className="h-4 w-4" />
          Back
        </Button>
        <Button
          type="submit"
          className="bg-[#7ea16b] text-white px-8 py-2 rounded-md
                   hover:bg-[#729461] transition-all duration-300"
        >
          Continue
        </Button>
      </div>
    </motion.form>
  )
};

export default WalletForm; 