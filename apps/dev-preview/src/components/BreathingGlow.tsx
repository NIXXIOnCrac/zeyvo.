import { motion } from 'framer-motion'

export function BreathingGlow({ state, reducedMotion }: { state: string; reducedMotion: boolean }) {
  if (reducedMotion) return null
  const isThinking = state === 'thinking'
  const isWorking = state === 'actionInProgress'
  const isListening = state === 'listening' || state === 'transcribing'
  const isSpeaking = state === 'speaking'
  const isSuccess = state === 'success'
  const isWarning = state === 'warning'
  const isError = state === 'error'
  const isPrivacy = state === 'privacyWarning'

  if (!isThinking && !isWorking && !isListening && !isSpeaking && !isSuccess && !isWarning && !isError && !isPrivacy) return null

  // Color cycles: electric blue → cyan → soft violet → blue
  const colors =
    isSuccess ? ['#30d15844','transparent'] :
    isWarning ? ['#ffd60a55','transparent'] :
    isError || isPrivacy ? ['#ff453a66','transparent'] :
    isListening ? ['#0a84ff66','#5ac8fa55'] :
    isSpeaking ? ['#0a84ff77','#bf5af2AA'] :
    ['#0a84ff33','#64d2ff44','#bf5af2AA','#0a84ff33']

  return (
    <motion.div
      className="absolute inset-0 pointer-events-none"
      style={{ borderRadius: 20, overflow:'hidden' }}
      animate={{
        opacity: isThinking || isWorking ? [0.5,0.9,0.5] : 0.85,
      }}
      transition={{ duration: isThinking ? 3.2 : isWorking ? 2.2 : 1.8, repeat: Infinity, ease: 'easeInOut' }}
    >
      <motion.div
        className="absolute inset-[-2px] rounded-[20px]"
        style={{
          background: `linear-gradient(90deg, ${colors.join(',')})`,
          filter:'blur(8px)',
          opacity:0.9
        }}
        animate={{ backgroundPosition: ['0% 50%','100% 50%','0% 50%'] }}
        transition={{ duration: 4, repeat: Infinity, ease:'linear' }}
      />
      {/* traveling highlight for executing */}
      {isWorking && (
        <motion.div
          className="absolute top-0 h-[2px] w-1/3 bg-white/60 blur-[2px] rounded-full"
          animate={{ x: ['-30%','120%'] }}
          transition={{ duration:1.8, repeat:Infinity, ease:'easeInOut' }}
        />
      )}
    </motion.div>
  )
}
