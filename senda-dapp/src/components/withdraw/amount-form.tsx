'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import Image from 'next/image';
import { useWithdrawForm } from '@/stores/use-withdraw-form';
import { useWalletBalances } from '@/hooks/use-wallet-balances';
import { motion } from 'framer-motion';
import { ArrowLeft, Coins } from 'lucide-react';

const AmountForm = () => {
  const { formData, setAmount, setToken, nextStep, prevStep } = useWithdrawForm();
  const [inputAmount, setInputAmount] = useState(formData.amount.toString());
  const [error, setError] = useState<string | null>(null);
  const { balances } = useWalletBalances();

  const selectedTokenBalance = balances.find(
    (balance) => balance.symbol === formData.token
  )?.uiBalance || 0;

  const handleTokenChange = (value: 'USDC' | 'USDT') => {
    setToken(value);
  };

  const handleAmountChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setInputAmount(value);
    
    // Validate it's a number and non-negative
    if (!/^\d*\.?\d*$/.test(value)) {
      setError('Please enter a valid number');
    } else {
      setError(null);
    }
  };
  
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    const amount = parseFloat(inputAmount);
    
    if (isNaN(amount) || amount <= 0) {
      setError('Please enter a valid amount');
      return;
    }
    
    if (amount > selectedTokenBalance) {
      setError(`You don't have enough ${formData.token}. Maximum available: ${selectedTokenBalance.toFixed(2)}`);
      return;
    }
    
    setAmount(amount);
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
        <div className="inline-block bg-[#7ea16b]/10 p-4 rounded-2xl mb-6">
          <Coins className="h-8 w-8 text-[#7ea16b]" />
        </div>
        <h2 className="text-2xl font-bold text-[#7ea16b] mb-3">Withdrawal Amount</h2>
        <p className="text-gray-600">Select your token and enter the amount to withdraw</p>
      </div>

      <div className="space-y-6">
        <div className=" rounded-xl p-6 border-2 border-gray-100">
          <label className="block text-sm font-medium text-gray-700 mb-2">Select Token</label>
          <Select value={formData.token} onValueChange={(value) => handleTokenChange(value as 'USDC' | 'USDT')}>
            <SelectTrigger className="w-full rounded-md">
              <SelectValue placeholder="Select a token" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="USDC" className="flex items-center">
                <div className="flex items-center">
                  <Image src={"usdc.svg"} alt="USDC" width={24} height={24} className="mr-2" />
                  <span>USDC</span>
                </div>
              </SelectItem>
              <SelectItem value="USDT">
                <div className="flex items-center">
                  <Image src={'usdt-round.svg'} alt="USDT" width={24} height={24} className="mr-2" />
                  <span>USDT</span>
                </div>
              </SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className=" rounded-xl p-6 border-2 border-gray-100">
          <label className="block text-sm font-medium text-gray-700 mb-2">Amount</label>
          <div className="flex items-center gap-3">
            <Input
              type="text"
              placeholder="0.00"
              value={inputAmount}
              onChange={handleAmountChange}
              className="flex-1 text-2xl font-medium rounded-md"
            />
            <Button
              type="button"
              variant="outline"
              onClick={() => setInputAmount(selectedTokenBalance.toString())}
              className="rounded-md border-2 hover:bg-[#f6ead7]/20 hover:border-[#7ea16b]"
            >
              Max
            </Button>
          </div>
          {error && (
            <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-sm text-red-500 mt-2">
              {error}
            </motion.p>
          )}
          <div className="w-full grid grid-cols-3 mt-4 text-xs text-gray-600">
            <div className="col-span-2 w-full">
              <span>Available: </span>
              <small className="font-medium text-[10px]">
                {selectedTokenBalance.toFixed(2)} {formData.token}
              </small>
            </div>
          </div>
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

export default AmountForm; 