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
    description: 'Analisis hasil belajarmu secara otomatis, cepat, dan detail dengan rumus yang akurat.',
  },
  {
    icon: FaComments,
    title: 'Diskusi',
    description: 'Kamu bisa berdiskusi tentang apapun bersama guru-guru yang hebat.',
  },
];

export default function FeatureCards() {
  return (
    <div className="relative py-8">
      <div className="mx-auto grid w-full max-w-7xl gap-8 sm:grid-cols-2 lg:grid-cols-4">
        {features.map((feature, index) => (
          <motion.article
            key={feature.title}
            initial={{ opacity: 0, y: 24 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, amount: 0.35 }}
            transition={{ duration: 0.5, delay: index * 0.08 }}
            className="feature-hover-card"
          >
            <div className="feature-slide feature-slide-front">
              <div className="feature-slide-content">
                <div className="feature-icon-shell">
                  <feature.icon
                    className="feature-icon"
                    aria-hidden="true"
                  />
                </div>
                <h3 className="feature-front-title">{feature.title}</h3>
              </div>
            </div>

            <div className="feature-slide feature-slide-back">
              <div className="feature-slide-content">
                <h3 className="feature-back-title">{feature.title}</h3>
                <p className="feature-back-description">{feature.description}</p>
              </div>
            </div>
          </motion.article>
        ))}
      </div>
    </div>
  );
}
