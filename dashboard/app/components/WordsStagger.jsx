'use client';
import { motion } from 'motion/react';

export function WordsStagger({ children, className, style, delay = 0, stagger = 0.1, speed = 0.5, autoStart = true, onComplete }) {
  const text = Array.isArray(children)
    ? children.filter(c => typeof c === 'string').join('')
    : typeof children === 'string' ? children : '';

  const words = text.split(' ').filter(w => w.length > 0);

  const transition = { type: 'tween', ease: 'easeOut', duration: speed };

  const containerVariants = {
    hidden: {},
    visible: {
      transition: { staggerChildren: stagger, delayChildren: delay },
    },
  };

  const wordVariants = {
    hidden: { opacity: 0, y: 10, filter: 'blur(10px)' },
    visible: { opacity: 1, y: 0, filter: 'blur(0px)', transition },
  };

  return (
    <motion.div
      className={className}
      style={{ display: 'flex', flexWrap: 'wrap', ...style }}
      variants={containerVariants}
      initial="hidden"
      animate={autoStart ? 'visible' : 'hidden'}
      onAnimationComplete={onComplete}
    >
      {words.map((word, index) => (
        <motion.span
          key={`${word}-${index}`}
          style={{ display: 'inline-block' }}
          variants={wordVariants}
        >
          {word}
          {index < words.length - 1 && (
            <span style={{ display: 'inline-block' }}>&nbsp;</span>
          )}
        </motion.span>
      ))}
    </motion.div>
  );
}
