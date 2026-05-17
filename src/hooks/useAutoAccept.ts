import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'

export function useAutoAccept(barberId: string | undefined) {
  const [autoAccept, setAutoAcceptState] = useState(false)
  const [loaded, setLoaded] = useState(false)

  useEffect(() => {
    if (!barberId) return
    supabase
      .from('barbers')
      .select('auto_accept')
      .eq('id', barberId)
      .single()
      .then(({ data }) => {
        if (data) setAutoAcceptState(data.auto_accept)
        setLoaded(true)
      })
  }, [barberId])

  async function setAutoAccept(value: boolean) {
    setAutoAcceptState(value)
    if (!barberId) return
    await supabase
      .from('barbers')
      .update({ auto_accept: value })
      .eq('id', barberId)
  }

  return { autoAccept, setAutoAccept, loaded }
}
