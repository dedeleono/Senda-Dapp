'use client';

import { Wallet, CreditCard } from 'lucide-react';
import { useWithdrawForm } from '@/stores/use-withdraw-form';
import { motion } from 'framer-motion';

const MethodSelect = () => {
  const { selectMethod } = useWithdrawForm();

  return (
    <div className="max-w-3xl mx-auto px-6 py-12">
      <div className="text-center mb-12">
        <h2 className="text-3xl font-bold text-[#1c3144] mb-3">Withdraw Funds</h2>
        <p className="text-gray-600 text-lg">Choose your preferred withdrawal method</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <motion.div
          whileHover={{ scale: 1.02, y: -4 }}
          whileTap={{ scale: 0.98 }}
          transition={{ type: 'spring', stiffness: 400 }}
        >
          <button
            onClick={() => selectMethod('wallet')}
            className="w-full bg-white hover:bg-[#f6ead7]/25 rounded-2xl p-8 
                     shadow-lg hover:shadow-[#d7dfbe]/50 transition-all duration-300 border border-[#d7dfbe]
                     group relative overflow-hidden"
          >
            
            <div className="relative flex flex-col items-center">
              <div
                className="bg-[#1c3144] p-6 rounded-2xl mb-6
                            group-hover:scale-110 transition-transform duration-300"
              >
                <Wallet className="h-10 w-10 text-[#7ea16b]" />
              </div>
              <h3 className="text-xl font-semibold text-gray-900 mb-4">Solana Wallet</h3>
            </div>
          </button>
        </motion.div>

        <motion.div
          whileHover={{ scale: 1.02, y: -4 }}
          whileTap={{ scale: 0.98 }}
          transition={{ type: 'spring', stiffness: 400 }}
        >
          <button
            onClick={() => selectMethod('bank')}
            className="w-full bg-white hover:bg-[#f6ead7]/25 rounded-2xl p-8
                     shadow-lg hover:shadow-[#d7dfbe]/50 transition-all duration-300 border border-[#d7dfbe]
                     group relative overflow-hidden"
          >
            <div className="relative flex flex-col items-center">
              <div
                className="bg-[#1c3144] p-6 rounded-2xl mb-6
                            group-hover:scale-110 transition-transform duration-300"
              >
                <CreditCard className="h-10 w-10 text-[#7ea16b]" />
              </div>
              <h3 className="text-xl font-semibold text-gray-900 ">Bank Account</h3>
              <small className=" text-xs text-[#1c3144] font-medium">Available in Guatemala</small>
            </div>
          </button>
        </motion.div>
      </div>
    </div>
  )
};

export default MethodSelect; 