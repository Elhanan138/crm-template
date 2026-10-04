import { motion } from 'framer-motion';

// Page transitions fade only. The old version also slid the page 8px, which on
// every click read as a jump — especially once the route chunk arrived a beat
// later. Short and vertical-shift-free keeps navigation feeling instant.
const pageVariants = {
  initial: { opacity: 0 },
  animate: { opacity: 1 },
  exit: { opacity: 0 },
};

const pageTransition = { duration: 0.12, ease: 'linear' };

export function MotionPage({ children, className }) {
  return (
    <motion.div
      initial="initial"
      animate="animate"
      exit="exit"
      variants={pageVariants}
      transition={pageTransition}
      className={className}
    >
      {children}
    </motion.div>
  );
}

export function FadeIn({ children, delay = 0, className }) {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.3, delay, ease: 'easeOut' }}
      className={className}
    >
      {children}
    </motion.div>
  );
}

export const staggerContainer = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.04 } },
};

export const staggerItem = {
  hidden: { opacity: 0, y: 6 },
  visible: { opacity: 1, y: 0 },
};

export function StaggerContainer({ children, className }) {
  return (
    <motion.div
      initial="hidden"
      animate="visible"
      variants={staggerContainer}
      className={className}
    >
      {children}
    </motion.div>
  );
}

// Self-driving on purpose. When it only carried `variants`, an item mounted
// after its container had finished animating could stay stuck at opacity 0 —
// invisible and unclickable. Declaring initial/animate here makes each item
// animate on its own regardless of the parent's timing.
export function StaggerItem({ children, className }) {
  return (
    <motion.div
      initial="hidden"
      animate="visible"
      variants={staggerItem}
      transition={{ duration: 0.2, ease: 'easeOut' }}
      className={className}
    >
      {children}
    </motion.div>
  );
}