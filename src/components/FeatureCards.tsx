'use client';

import { motion } from 'framer-motion';
import { FaList, FaBug, FaBolt, FaComments } from 'react-icons/fa';

const features = [
  {
    icon: FaList,
    title: 'Asesmen',
    description: 'Ukur pemahamanmu secara langsung dengan fitur asesmen interaktif.',
  },
  {
    icon: FaBug,
    title: 'PBL',
    description: 'Pembelajaran berorientasi masalah untuk meningkatkan pemahaman kamu.',
  },
  {
    icon: FaBolt,
    title: 'Analisis Otomatis',
    description: 'Analisis hasil belajarmu secara otomatis dan cepat dengan integrasi AI.',
  },
  {
    icon: FaComments,
    title: 'Diskusi',
    description: 'Kamu bisa berdiskusi tentang apapun bersama guru-guru yang hebat.',
  },
];

export default function FeatureCards() {
  return (
    <div className="relative overflow-hidden py-8">
      <motion.div
        className="flex gap-6"
        animate={{
          x: [0, -1920],
        }}
        transition={{
          x: {
            repeat: Infinity,
            repeatType: 'loop',
            duration: 30,
            ease: 'linear',
          },
        }}
      >
        {/* Duplicate features for seamless loop */}
        {[...features, ...features, ...features].map((feature, index) => (
          <motion.div
            key={index}
            whileHover={{ scale: 1.05 }}
            className="min-w-[320px] bg-black/30 backdrop-blur-md border border-white/10 rounded-2xl p-6 hover:shadow-[0_0_40px_rgba(0,128,255,0.4)] hover:border-[#0080FF]/50 transition-all duration-300"
          >
            <div className="flex flex-col items-center text-center gap-4">
              <div className="bg-[#0080FF]/20 p-4 rounded-full">
                <feature.icon className="text-current text-4xl" />
              </div>
              <h3 className="text-white text-xl font-semibold">{feature.title}</h3>
              <p className="text-gray-400 text-sm">{feature.description}</p>
            </div>
          </motion.div>
        ))}
      </motion.div>
    </div>
  );
}
