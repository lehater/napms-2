import { Button } from './ui/button'

export default function ErrorNotice({ text, retry }: { text: string; retry?: () => void }) {
  return text ? <div className="ux-error"><p role="alert">{text}</p>{retry && <Button variant="outline" onClick={retry}>Повторить</Button>}</div> : null
}
