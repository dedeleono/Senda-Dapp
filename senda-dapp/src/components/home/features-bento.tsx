import { BentoGrid, BentoGridItem } from '@/components/ui/acernity/bento-grid'
import { LuCircleDollarSign, LuCreditCard, LuGlobe, LuShieldCheck } from 'react-icons/lu'

export function FeaturesBento() {
  return (
    <BentoGrid className="max-w-7xl mx-auto md:auto-rows-[20rem]">
      {items.map((item, i) => (
        <BentoGridItem
          key={i}
          title={item.title}
          description={item.description}
          header={item.header}
          className={item.className}
          icon={item.icon}
        />
      ))}
    </BentoGrid>
  )
}
const Skeleton = () => (
  <div className="flex flex-1 w-full h-full min-h-[6rem] rounded-xl   dark:bg-dot-white/[0.2] bg-dot-black/[0.2] [mask-image:radial-gradient(ellipse_at_center,white,transparent)]  border border-transparent dark:border-white/[0.2] bg-neutral-100 dark:bg-black"></div>
)
const items = [
  {
    title: 'Secure Escrow',
    description:
      'Dual-signature blockchain escrow ensures funds are only released when both parties approve the transaction.',
    header: <Skeleton />,
    className: 'md:col-span-2',
    icon: <LuShieldCheck className="text-primary-600 text-3xl" />,
  },
  {
    title: 'Global Access',
    description: 'Send money anywhere in the world without traditional banking restrictions or delays.',
    header: <Skeleton />,
    className: 'md:col-span-1',
    icon: <LuGlobe className="text-primary-600 text-3xl" />,
  },
  {
    title: 'Lowest Fees',
    description: 'Significantly reduced transaction costs compared to traditional banking and remittance services.',
    header: <Skeleton />,
    className: 'md:col-span-1',
    icon: <LuCircleDollarSign className="text-primary-600 text-3xl" />,
  },
  {
    title: 'On/Off-Ramp Funds',
    description: 'Easily manage your funds using Apple Pay, Google Pay, or your preferred traditional banking methods.',
    header: <Skeleton />,
    className: 'md:col-span-2',
    icon: <LuCreditCard className="text-primary-600 text-3xl" />,
  },
]
