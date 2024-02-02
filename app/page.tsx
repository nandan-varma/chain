'use client'
import ChainGrid from "@/components/chain"
import { Button } from "@/components/ui/button"

export default function IndexPage() {
  return (
    <section className="container grid items-center gap-6 pb-8 pt-6 md:py-10">
      <a href={`/${Math.floor((Math.random()*1000+1000)%10000)}`}>
        <Button>Play</Button>
      </a>
    </section>
  )
}
