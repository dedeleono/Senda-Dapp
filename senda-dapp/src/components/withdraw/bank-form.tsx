'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useWithdrawForm } from '@/stores/use-withdraw-form';
import { CreditCard, ArrowLeft } from 'lucide-react';
import { motion } from 'framer-motion';
import Image from 'next/image';

const BankForm = () => {
  const { formData, setBankInfo, nextStep, prevStep } = useWithdrawForm();
  const [bankInfo, setBankInfoLocal] = useState({
    accountName: formData.bankInfo?.accountName || '',
    accountNumber: formData.bankInfo?.accountNumber || '',
    routingNumber: formData.bankInfo?.routingNumber || '',
    bankName: formData.bankInfo?.bankName || '',
  });
  const [errors, setErrors] = useState<Record<string, string>>({});

  const handleInputChange = (field: keyof typeof bankInfo, value: string) => {
    setBankInfoLocal({ ...bankInfo, [field]: value });
    
    // Clear error for this field if value is entered
    if (value) {
      setErrors((prev) => {
        const newErrors = { ...prev };
        delete newErrors[field];
        return newErrors;
      });
    }
  };

  const validateForm = () => {
    const newErrors: Record<string, string> = {};
    
    if (!bankInfo.accountName.trim()) {
      newErrors.accountName = 'Account name is required';
    }
    
    if (!bankInfo.accountNumber.trim()) {
      newErrors.accountNumber = 'Account number is required';
    } else if (!/^\d+$/.test(bankInfo.accountNumber)) {
      newErrors.accountNumber = 'Account number must only contain digits';
    }
    
    if (!bankInfo.routingNumber.trim()) {
      newErrors.routingNumber = 'Routing number is required';
    } else if (!/^\d{9}$/.test(bankInfo.routingNumber)) {
      newErrors.routingNumber = 'Routing number must be 9 digits';
    }
    
    if (!bankInfo.bankName.trim()) {
      newErrors.bankName = 'Bank name is required';
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (validateForm()) {
      setBankInfo(bankInfo);
      nextStep();
    }
  };

  return (
    <motion.div 
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="h-full max-h-[calc(100vh-250px)] overflow-y-auto px-4"
    >
      <form onSubmit={handleSubmit} className="space-y-8 max-w-2xl mx-auto py-8">
        <div className="text-center flex flex-col spce-y-1">
          
          <h2 className="text-2xl font-bold text-[#1c3144] mb-1">
            Withdraw to Bank Account
          </h2>
          
          <div className="mt-1 flex items-center justify-center gap-2 text-sm text-gray-500">
            <span>Available in Guatemala</span>
            <span className="text-[#d7dfbe]">|</span>
            <span>Powered by</span>
            <Image 
              src="https://cdn.prod.website-files.com/66c35e8262b10fa677d4282c/66c36d87c4b68f50f55a13b9_Copy%20of%20Maverick-Logo-09-p-500.png"
              alt="Maverick Capital Investment"
              width={90}
              height={25}
              className="object-contain"
            />
          </div>
        </div>

        <div className="space-y-6">
          <div className="bg-white rounded-xl p-6 border-2 border-[#d7dfbe]">
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-[#1c3144] mb-2">
                  Account Holder Name
                </label>
                <Input
                  type="text"
                  placeholder="Your full name"
                  value={bankInfo.accountName}
                  onChange={(e) => handleInputChange('accountName', e.target.value)}
                  className="w-full rounded-md border-2 focus:border-[#7ea16b] transition-colors duration-200"
                />
                {errors.accountName && (
                  <motion.p 
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="text-sm text-red-500 mt-2"
                  >
                    {errors.accountName}
                  </motion.p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-[#1c3144] mb-2">
                  Bank Name
                </label>
                <Input
                  type="text"
                  placeholder="Bank of America, Chase, etc."
                  value={bankInfo.bankName}
                  onChange={(e) => handleInputChange('bankName', e.target.value)}
                  className="w-full rounded-md border-2 focus:border-[#7ea16b] transition-colors duration-200"
                />
                {errors.bankName && (
                  <motion.p 
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="text-sm text-red-500 mt-2"
                  >
                    {errors.bankName}
                  </motion.p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-[#1c3144] mb-2">
                  Account Number
                </label>
                <Input
                  type="text"
                  placeholder="Enter account number"
                  value={bankInfo.accountNumber}
                  onChange={(e) => handleInputChange('accountNumber', e.target.value)}
                  className="w-full rounded-md border-2 focus:border-[#7ea16b] transition-colors duration-200"
                />
                {errors.accountNumber && (
                  <motion.p 
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="text-sm text-red-500 mt-2"
                  >
                    {errors.accountNumber}
                  </motion.p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-[#1c3144] mb-2">
                  Routing Number
                </label>
                <Input
                  type="text"
                  placeholder="9-digit routing number"
                  value={bankInfo.routingNumber}
                  onChange={(e) => handleInputChange('routingNumber', e.target.value)}
                  className="w-full rounded-md border-2 focus:border-[#7ea16b] transition-colors duration-200"
                />
                {errors.routingNumber && (
                  <motion.p 
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="text-sm text-red-500 mt-2"
                  >
                    {errors.routingNumber}
                  </motion.p>
                )}
              </div>
            </div>
          </div>
        </div>

        <div className="flex justify-between items-center pt-6 sticky bottom-0 bg-white/80 backdrop-blur-sm py-4">
          <Button
            type="button"
            variant="ghost"
            onClick={prevStep}
            className="text-[#1c3144] hover:text-[#7ea16b] flex items-center gap-2"
          >
            <ArrowLeft className="h-4 w-4" />
            Back
          </Button>
          <Button
            type="submit"
            className="bg-[#7ea16b] text-white hover:bg-[#729461] px-8 py-2 rounded-md transition-colors duration-300"
          >
            Continue
          </Button>
        </div>
      </form>
    </motion.div>
  );
};

export default BankForm; 