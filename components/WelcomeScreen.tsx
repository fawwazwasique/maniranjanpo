
import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { LogoIcon } from './icons';

interface WelcomeScreenProps {
  onComplete: () => void;
}

const WelcomeScreen: React.FC<WelcomeScreenProps> = ({ onComplete }) => {
  const [isVisible, setIsVisible] = useState(true);

  useEffect(() => {
    const timer = setTimeout(() => {
      setIsVisible(false);
      setTimeout(onComplete, 1000); // Wait for exit animation
    }, 5000); // Show for 5 seconds

    return () => clearTimeout(timer);
  }, [onComplete]);

  return (
    <AnimatePresence>
      {isVisible && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0, scale: 1.1, filter: 'blur(10px)' }}
          transition={{ duration: 0.8, ease: "easeInOut" }}
          className="fixed inset-0 z-[9999] flex flex-col items-center justify-center bg-slate-900 text-white overflow-hidden"
        >
          {/* Animated Background Elements */}
          <motion.div 
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1.2, opacity: 0.1 }}
            transition={{ duration: 4, repeat: Infinity, repeatType: "reverse" }}
            className="absolute w-[800px] h-[800px] bg-primary rounded-full blur-[120px] -z-10"
          />
          
          <motion.div
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.5, duration: 0.8 }}
            className="flex flex-col items-center text-center px-6"
          >
            <div className="bg-white p-4 rounded-3xl shadow-2xl mb-8">
              <LogoIcon className="h-24 w-24 text-primary" />
            </div>
            
            <motion.h1 
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 1, duration: 0.5 }}
              className="text-4xl md:text-5xl font-black tracking-tighter mb-4"
            >
              Welcome to <span className="text-primary">ETHEN POWER SOLUTIONNS</span>
            </motion.h1>
            
            <motion.p
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 1.5, duration: 0.5 }}
              className="text-xl md:text-2xl font-bold text-slate-400 uppercase tracking-[0.3em] mb-12"
            >
              POWER SOLUTIONNS
            </motion.p>

            {/* Fawwaz Creations Credit */}
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 2.2, duration: 0.8 }}
              className="flex flex-col items-center"
            >
              <p className="text-[10px] font-bold text-slate-500 uppercase tracking-[0.4em] mb-2">Designed & Developed by</p>
              <motion.div
                animate={{ 
                  opacity: [0.7, 1, 0.7],
                }}
                transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
                className="flex items-center gap-1.5"
              >
                <span className="text-sm font-black tracking-tighter text-white">FAWWAZ</span>
                <div className="h-1 w-1 rounded-full bg-primary" />
                <span className="text-sm font-black tracking-tighter text-primary">CREATIONS</span>
              </motion.div>
            </motion.div>
          </motion.div>

          {/* Loading Indicator */}
          <motion.div 
            className="absolute bottom-12 flex space-x-2"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 3 }}
          >
            {[0, 1, 2].map((i) => (
              <motion.div
                key={i}
                animate={{ scale: [1, 1.5, 1], opacity: [0.3, 1, 0.3] }}
                transition={{ duration: 1, repeat: Infinity, delay: i * 0.2 }}
                className="w-2 h-2 bg-primary rounded-full"
              />
            ))}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default WelcomeScreen;
