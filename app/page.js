'use client'
import { useEffect, useMemo, useState, useCallback, createContext, useContext } from 'react'
import { Toaster, toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogTrigger } from '@/components/ui/dialog'
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'
import { Select, SelectTrigger, SelectContent, SelectItem, SelectValue } from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { Switch } from '@/components/ui/switch'
import {
  ShoppingBag, Heart, User, Search, Menu, X, ChevronRight, ChevronLeft, Plus, Minus,
  Trash2, LogOut, Edit3, Package, Mail, MessageCircle, Settings as SettingsIcon,
  Truck, Star, Filter, Check, ArrowRight, Instagram, Facebook, Twitter,
} from 'lucide-react'

// ---------- Context ----------
const AppCtx = createContext(null)
const useApp = () => useContext(AppCtx)

// ---------- Helpers ----------
const money = (n, sym = '₹') => `${sym}${(n || 0).toLocaleString('en-IN')}`
const cx = (...a) => a.filter(Boolean).join(' ')

// Map friendly colour names to CSS colours for swatch previews
function colorHex(name){
  const map = {
    noir:'#0a0a0a', black:'#0a0a0a', jet:'#000000', ivory:'#f5efe6', white:'#ffffff', cream:'#f5efe6',
    champagne:'#dcc8a1', gold:'#c8a15b', beige:'#c9b898', sand:'#d9c7a2', camel:'#b48a5b',
    charcoal:'#333333', grey:'#808080', gray:'#808080', silver:'#c0c0c0',
    navy:'#1e2a44', midnight:'#1a1a2e', blue:'#3d5a80', teal:'#2a6f6b',
    emerald:'#046a38', forest:'#1e3d2f', olive:'#556b2f', sage:'#a3b18a',
    burgundy:'#800020', maroon:'#800000', red:'#b0202e', wine:'#7b1e2b', rose:'#c98b8b', blush:'#f2d3d0',
    pink:'#e8b4bc', mauve:'#a37f8f', lilac:'#c8a2c8', purple:'#6b3fa0', plum:'#5d3754',
    brown:'#5b3a1f', chocolate:'#3d2418', tan:'#b48a5b', mocha:'#4a2f1d',
    yellow:'#e5b83b', mustard:'#c99a2b', orange:'#c1622b',
  }
  const key = String(name||'').toLowerCase().trim()
  return map[key] || '#8b7b5a'
}

// ---------- Root ----------
export default function App() {
  const [view, setView] = useState({ name: 'home', params: {} })
  const [user, setUser] = useState(null)
  const [token, setToken] = useState(null)
  const [settings, setSettings] = useState(null)
  const [collections, setCollections] = useState([])
  const [cart, setCart] = useState([])
  const [wishlist, setWishlist] = useState([])
  const [menuOpen, setMenuOpen] = useState(false)
  const [cartOpen, setCartOpen] = useState(false)
  const [transparentLogo, setTransparentLogo] = useState(null)
  const [allProducts, setAllProducts] = useState([])

  const api = useCallback(async (path, opts = {}) => {
    const headers = { 'Content-Type': 'application/json', ...(opts.headers || {}) }
    if (token) headers.Authorization = `Bearer ${token}`
    const res = await fetch(`/api${path}`, { ...opts, headers, body: opts.body ? JSON.stringify(opts.body) : undefined })
    const data = await res.json().catch(() => ({}))
    if (!res.ok) throw new Error(data.error || 'Request failed')
    return data
  }, [token])

  const navigate = (name, params = {}) => {
    setView({ name, params }); setMenuOpen(false); setCartOpen(false)
    if (typeof window !== 'undefined') window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  // Load initial
  useEffect(() => {
    (async () => {
      try {
        const s = await api('/settings'); setSettings(s.settings)
        const c = await api('/collections'); setCollections(c.collections || [])
      } catch (e) { console.error(e) }
      const t = localStorage.getItem('yash_token')
      if (t) setToken(t)
      const cc = localStorage.getItem('yash_cart')
      if (cc) try { setCart(JSON.parse(cc)) } catch {}
    })()
  }, [])

  // Auth check when token set
  useEffect(() => {
    if (!token) { setUser(null); return }
    (async () => {
      try {
        const r = await api('/auth/me')
        if (r.user) setUser(r.user)
        else { setToken(null); localStorage.removeItem('yash_token') }
      } catch { setToken(null); localStorage.removeItem('yash_token') }
    })()
  }, [token, api])

  useEffect(() => { localStorage.setItem('yash_cart', JSON.stringify(cart)) }, [cart])

  // Fetch all products once (for dynamic filter facets)
  useEffect(() => {
    api('/products').then(r => setAllProducts(r.products || [])).catch(()=>{})
  }, [api])

  // Process logo to remove white background (canvas-based transparent conversion)
  useEffect(() => {
    if (!settings?.logoUrl) return
    const img = new window.Image()
    img.crossOrigin = 'anonymous'
    img.onload = () => {
      try {
        const canvas = document.createElement('canvas')
        canvas.width = img.naturalWidth
        canvas.height = img.naturalHeight
        const ctx = canvas.getContext('2d')
        ctx.drawImage(img, 0, 0)
        const d = ctx.getImageData(0, 0, canvas.width, canvas.height)
        for (let i = 0; i < d.data.length; i += 4) {
          const r = d.data[i], g = d.data[i+1], b = d.data[i+2]
          if (r > 225 && g > 225 && b > 225) d.data[i+3] = 0
          else if (r > 200 && g > 200 && b > 200) d.data[i+3] = Math.max(0, 255 - Math.round(((r+g+b)/3 - 200) * 10))
        }
        ctx.putImageData(d, 0, 0)
        setTransparentLogo(canvas.toDataURL('image/png'))
      } catch (e) { /* CORS blocked, keep original with mix-blend */ }
    }
    img.src = settings.logoUrl
  }, [settings?.logoUrl])

  // Hidden admin portal: navigate to admin login when URL hash is #atelier
  useEffect(() => {
    const check = () => {
      if (typeof window === 'undefined') return
      const h = window.location.hash
      if (h === '#atelier' || h === '#admin' || h === '#admin-portal') {
        setView({ name: 'adminLogin', params: {} })
      }
    }
    check()
    window.addEventListener('hashchange', check)
    return () => window.removeEventListener('hashchange', check)
  }, [])

  const setAuth = (tok, u) => {
    if (tok) localStorage.setItem('yash_token', tok); else localStorage.removeItem('yash_token')
    setToken(tok || null); setUser(u || null)
  }

  const addToCart = (product, size, color, qty = 1) => {
    setCart(prev => {
      const key = `${product.id}|${size}|${color}`
      const i = prev.findIndex(x => x.key === key)
      if (i >= 0) { const copy = [...prev]; copy[i] = { ...copy[i], qty: copy[i].qty + qty }; return copy }
      return [...prev, { key, id: product.id, name: product.name, price: product.salePrice || product.price, image: product.images?.[0], size, color, qty }]
    })
    toast.success('Added to bag')
  }
  const updateQty = (key, qty) => setCart(prev => prev.map(x => x.key === key ? { ...x, qty: Math.max(1, qty) } : x))
  const removeFromCart = (key) => setCart(prev => prev.filter(x => x.key !== key))
  const clearCart = () => setCart([])

  const toggleWishlist = async (productId) => {
    if (!user) { toast.error('Please sign in to save favourites'); navigate('login'); return }
    const isIn = wishlist.includes(productId)
    if (isIn) { await api(`/wishlist/${productId}`, { method: 'DELETE' }); setWishlist(w => w.filter(x => x !== productId)) }
    else { await api('/wishlist', { method: 'POST', body: { productId } }); setWishlist(w => [...w, productId]) }
  }
  useEffect(() => {
    if (!user) { setWishlist([]); return }
    api('/wishlist').then(r => setWishlist(r.productIds || [])).catch(()=>{})
  }, [user, api])

  const ctxValue = { view, navigate, user, token, setAuth, settings, setSettings, collections, setCollections, cart, addToCart, updateQty, removeFromCart, clearCart, wishlist, toggleWishlist, api, cartOpen, setCartOpen, menuOpen, setMenuOpen, transparentLogo, allProducts, setAllProducts }

  if (!settings) return <div className="min-h-screen flex items-center justify-center bg-background"><Loader /></div>

  return (
    <AppCtx.Provider value={ctxValue}>
      <Toaster position="top-center" toastOptions={{ className: 'font-sans text-sm' }} />
      <AnnouncementBar />
      <Header />
      <CartDrawer />
      <MobileMenu />
      <main className="min-h-[70vh]">
        {view.name === 'home' && <HomeView />}
        {view.name === 'shop' && <ShopView />}
        {view.name === 'product' && <ProductView />}
        {view.name === 'cart' && <CartView />}
        {view.name === 'checkout' && <CheckoutView />}
        {view.name === 'order-success' && <OrderSuccessView />}
        {view.name === 'login' && <LoginView />}
        {view.name === 'register' && <RegisterView />}
        {view.name === 'forgot' && <ForgotView />}
        {view.name === 'reset' && <ResetView />}
        {view.name === 'adminLogin' && <AdminLoginView />}
        {view.name === 'concierge' && <ConciergeView />}
        {view.name === 'dashboard' && <DashboardView />}
        {view.name === 'admin' && <AdminView />}
        {view.name === 'about' && <AboutView />}
      </main>
      <Footer />
    </AppCtx.Provider>
  )
}

function Loader() { return <div className="text-foreground/60 text-xs tracking-luxe uppercase">YASH</div> }

// ---------- Header ----------
function AnnouncementBar() {
  const { settings } = useApp()
  if (!settings?.announcement) return null
  return (
    <div className="bg-primary text-primary-foreground text-[11px] tracking-editorial uppercase py-2.5 text-center px-4">
      {settings.announcement}
    </div>
  )
}

function Header() {
  const { navigate, user, cart, settings, setCartOpen, setMenuOpen, view, transparentLogo } = useApp()
  const [scrolled, setScrolled] = useState(false)
  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 20)
    window.addEventListener('scroll', onScroll); return () => window.removeEventListener('scroll', onScroll)
  }, [])
  const cartCount = cart.reduce((s, x) => s + x.qty, 0)
  const transparent = view.name === 'home' && !scrolled
  const logoSrc = transparentLogo || settings.logoUrl
  return (
    <header className={cx('sticky top-0 z-40 transition-all', transparent ? 'bg-transparent' : 'bg-background/90 backdrop-blur-md border-b border-border')}>
      <div className="max-w-[1400px] mx-auto px-4 md:px-8 h-20 flex items-center justify-between">
        <div className="flex items-center gap-6 flex-1">
          <button className="md:hidden" onClick={() => setMenuOpen(true)}><Menu className={cx('w-5 h-5', transparent && 'text-white')}/></button>
          <nav className={cx('hidden md:flex items-center gap-8 text-[11px] tracking-editorial uppercase', transparent && 'text-white')}>
            <button onClick={() => navigate('shop')} className="hover:text-accent transition-colors">Shop</button>
            <button onClick={() => navigate('shop', { collection: 'womenswear' })} className="hover:text-accent transition-colors">Women</button>
            <button onClick={() => navigate('shop', { collection: 'menswear' })} className="hover:text-accent transition-colors">Men</button>
            <button onClick={() => navigate('shop', { collection: 'accessories' })} className="hover:text-accent transition-colors">Accessories</button>
            <button onClick={() => navigate('concierge')} className="hover:text-accent transition-colors">Concierge</button>
          </nav>
        </div>
        <button onClick={() => navigate('home')} className="flex items-center justify-center">
          <img src={logoSrc} alt={settings.brand} className={cx('h-12 md:h-14 object-contain', !transparentLogo && 'mix-blend-multiply', transparent && 'brightness-0 invert')} />
        </button>
        <div className={cx('flex items-center gap-4 flex-1 justify-end', transparent ? 'text-white' : 'text-foreground')}>
          <button onClick={() => navigate('shop')} className="hidden md:block"><Search className="w-4 h-4"/></button>
          {user
            ? <button onClick={() => navigate(user.role === 'admin' ? 'admin' : 'dashboard')} className="text-[11px] tracking-editorial uppercase hidden md:flex items-center gap-2"><User className="w-4 h-4"/> {user.role === 'admin' ? 'Admin' : 'Account'}</button>
            : <button onClick={() => navigate('login')} className="text-[11px] tracking-editorial uppercase hidden md:flex items-center gap-2"><User className="w-4 h-4"/>Sign In</button>
          }
          <button onClick={() => setCartOpen(true)} className="relative flex items-center gap-1">
            <ShoppingBag className="w-4 h-4"/>
            {cartCount > 0 && <span className="text-[10px] tracking-editorial">({cartCount})</span>}
          </button>
        </div>
      </div>
    </header>
  )
}

function MobileMenu() {
  const { menuOpen, setMenuOpen, navigate, user } = useApp()
  return (
    <Sheet open={menuOpen} onOpenChange={setMenuOpen}>
      <SheetContent side="left" className="w-[85vw] sm:w-[380px] bg-background">
        <SheetHeader><SheetTitle className="font-serif text-2xl">Menu</SheetTitle></SheetHeader>
        <div className="mt-8 flex flex-col gap-5 text-sm tracking-editorial uppercase">
          {['shop','womenswear','menswear','accessories'].map((c,i)=>(
            <button key={c} onClick={()=>navigate('shop', c==='shop'?{}:{collection:c})} className="text-left border-b border-border pb-3">{c==='shop'?'All':c}</button>
          ))}
          <button onClick={()=>navigate('concierge')} className="text-left border-b border-border pb-3">Concierge</button>
          <button onClick={()=>navigate(user? (user.role==='admin'?'admin':'dashboard'):'login')} className="text-left border-b border-border pb-3">{user?'Account':'Sign In'}</button>
        </div>
      </SheetContent>
    </Sheet>
  )
}

function CartDrawer() {
  const { cartOpen, setCartOpen, cart, updateQty, removeFromCart, navigate, settings } = useApp()
  const subtotal = cart.reduce((s, x) => s + x.price * x.qty, 0)
  return (
    <Sheet open={cartOpen} onOpenChange={setCartOpen}>
      <SheetContent side="right" className="w-[92vw] sm:w-[440px] bg-background flex flex-col">
        <SheetHeader><SheetTitle className="font-serif text-2xl">Your Bag</SheetTitle></SheetHeader>
        {cart.length === 0
          ? <div className="flex-1 flex flex-col items-center justify-center text-muted-foreground text-sm">
              <ShoppingBag className="w-8 h-8 mb-4 opacity-40"/>
              Your bag is empty
              <Button variant="outline" className="mt-6 rounded-none" onClick={()=>{setCartOpen(false); navigate('shop')}}>Continue Shopping</Button>
            </div>
          : <>
              <div className="flex-1 overflow-y-auto py-6 space-y-6">
                {cart.map(item => (
                  <div key={item.key} className="flex gap-4">
                    <img src={item.image} alt={item.name} className="w-20 h-28 object-cover"/>
                    <div className="flex-1 flex flex-col">
                      <div className="flex justify-between gap-2">
                        <div>
                          <div className="text-sm font-medium">{item.name}</div>
                          <div className="text-xs text-muted-foreground mt-1">{item.color} · Size {item.size}</div>
                        </div>
                        <button onClick={()=>removeFromCart(item.key)}><Trash2 className="w-3.5 h-3.5 text-muted-foreground hover:text-foreground"/></button>
                      </div>
                      <div className="mt-auto flex items-center justify-between">
                        <div className="flex items-center border border-border">
                          <button className="px-2 py-1" onClick={()=>updateQty(item.key, item.qty-1)}><Minus className="w-3 h-3"/></button>
                          <span className="px-3 text-xs">{item.qty}</span>
                          <button className="px-2 py-1" onClick={()=>updateQty(item.key, item.qty+1)}><Plus className="w-3 h-3"/></button>
                        </div>
                        <div className="text-sm">{money(item.price*item.qty, settings.currencySymbol)}</div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
              <div className="border-t border-border pt-4 space-y-4">
                <div className="flex justify-between text-sm"><span className="tracking-editorial uppercase text-xs">Subtotal</span><span>{money(subtotal, settings.currencySymbol)}</span></div>
                <div className="text-xs text-muted-foreground">Shipping & taxes calculated at checkout.</div>
                <Button className="w-full rounded-none h-12 tracking-editorial uppercase text-xs" onClick={()=>{setCartOpen(false); navigate('checkout')}}>Proceed to Checkout</Button>
              </div>
            </>}
      </SheetContent>
    </Sheet>
  )
}

// ---------- Home ----------
function HomeView() {
  const { settings, collections, navigate, api } = useApp()
  const [featured, setFeatured] = useState([])
  useEffect(() => { api('/products?featured=true').then(r => setFeatured(r.products.slice(0,4))).catch(()=>{}) }, [api])

  return (
    <div>
      {/* Hero */}
      <section className="relative h-[92vh] -mt-20 overflow-hidden">
        <img src={settings.heroImage} alt="" className="absolute inset-0 w-full h-full object-cover" />
        <div className="absolute inset-0 bg-gradient-to-b from-black/40 via-black/20 to-black/60"/>
        <div className="relative z-10 h-full flex flex-col items-center justify-end pb-24 text-center px-6 slow-fade">
          <div className="text-white/80 text-[11px] tracking-luxe uppercase mb-6">{settings.heroEyebrow || 'Season 01 — Nocturne'}</div>
          <h1 className="font-serif text-white text-6xl md:text-8xl lg:text-9xl leading-[0.95] font-light">{settings.heroTitle}</h1>
          <p className="text-white/85 mt-6 max-w-xl text-sm md:text-base">{settings.heroSubtitle}</p>
          <Button onClick={()=>navigate('shop')} className="mt-10 rounded-none bg-white text-black hover:bg-white/90 h-12 px-10 tracking-editorial uppercase text-xs">{settings.heroCtaLabel || 'Discover the Collection'}</Button>
        </div>
      </section>

      {/* Collections */}
      <section className="max-w-[1400px] mx-auto px-4 md:px-8 py-24 md:py-32">
        <div className="text-center mb-16">
          <div className="text-[11px] tracking-luxe uppercase text-accent mb-4">{settings.collectionsEyebrow || 'Curated Collections'}</div>
          <h2 className="font-serif text-4xl md:text-5xl">{settings.collectionsTitle || 'A house, quietly assembled.'}</h2>
        </div>
        <div className="grid md:grid-cols-3 gap-6 md:gap-10">
          {collections.map(c => (
            <button key={c.id} onClick={()=>navigate('shop',{collection:c.slug})} className="group text-left">
              <div className="img-zoom aspect-[3/4] overflow-hidden bg-muted">
                <img src={c.image} alt={c.name} className="w-full h-full object-cover"/>
              </div>
              <div className="mt-5 flex items-baseline justify-between">
                <h3 className="font-serif text-2xl">{c.name}</h3>
                <span className="text-[11px] tracking-editorial uppercase group-hover:text-accent transition-colors">Explore →</span>
              </div>
              <p className="text-sm text-muted-foreground mt-1">{c.description}</p>
            </button>
          ))}
        </div>
      </section>

      {/* Featured */}
      <section className="bg-muted/40 py-24 md:py-32">
        <div className="max-w-[1400px] mx-auto px-4 md:px-8">
          <div className="flex items-end justify-between mb-12">
            <div>
              <div className="text-[11px] tracking-luxe uppercase text-accent mb-3">{settings.featuredEyebrow || 'The Edit'}</div>
              <h2 className="font-serif text-4xl md:text-5xl">{settings.featuredTitle || 'Signature Pieces'}</h2>
            </div>
            <button onClick={()=>navigate('shop')} className="text-[11px] tracking-editorial uppercase hover:text-accent">{settings.featuredCtaLabel || 'View All →'}</button>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 md:gap-8">
            {featured.map(p => <ProductCard key={p.id} p={p}/>)}
          </div>
        </div>
      </section>

      {/* Lookbook */}
      <section className="py-24 md:py-32 max-w-[1400px] mx-auto px-4 md:px-8">
        <div className="text-center mb-16">
          <div className="text-[11px] tracking-luxe uppercase text-accent mb-4">{settings.lookbookSubtitle}</div>
          <h2 className="font-serif text-4xl md:text-5xl">{settings.lookbookTitle}</h2>
        </div>
        <div className="grid md:grid-cols-3 gap-2 md:gap-4">
          {(settings.lookbookImages||[]).map((img,i)=>(
            <div key={i} className={cx('img-zoom', i===1?'md:mt-16':'')}>
              <img src={img} alt="" className="w-full aspect-[3/4] object-cover"/>
            </div>
          ))}
        </div>
      </section>

      {/* About */}
      <section className="bg-primary text-primary-foreground py-24 md:py-32">
        <div className="max-w-3xl mx-auto text-center px-6">
          <div className="text-[11px] tracking-luxe uppercase text-accent mb-6">{settings.aboutEyebrow || 'Maison'}</div>
          <h2 className="font-serif text-4xl md:text-5xl mb-8">{settings.aboutTitle}</h2>
          <div className="divider-gold mx-auto w-32 mb-8"/>
          <p className="text-primary-foreground/80 leading-relaxed">{settings.aboutBody}</p>
        </div>
      </section>

      {/* Concierge CTA */}
      <section className="py-24 max-w-3xl mx-auto text-center px-6">
        <div className="text-[11px] tracking-luxe uppercase text-accent mb-4">{settings.concierge?.title || 'Concierge'}</div>
        <h2 className="font-serif text-4xl md:text-5xl mb-4">{settings.conciergeCtaTitle || 'Bespoke, on request.'}</h2>
        <p className="text-muted-foreground mb-8">{settings.concierge?.subtitle}</p>
        <Button onClick={()=>navigate('concierge')} variant="outline" className="rounded-none border-primary tracking-editorial uppercase text-xs h-12 px-10">{settings.conciergeCtaLabel || 'Request a Consultation'}</Button>
      </section>
    </div>
  )
}

function ProductCard({ p }) {
  const { navigate, settings, toggleWishlist, wishlist } = useApp()
  const inWish = wishlist.includes(p.id)
  return (
    <div className="group cursor-pointer" onClick={()=>navigate('product',{id:p.id})}>
      <div className="img-zoom aspect-[3/4] bg-muted relative overflow-hidden">
        <img src={p.images?.[0]} alt={p.name} className="w-full h-full object-cover"/>
        <button onClick={(e)=>{e.stopPropagation(); toggleWishlist(p.id)}} className="absolute top-3 right-3 w-8 h-8 rounded-full bg-white/90 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
          <Heart className={cx('w-3.5 h-3.5', inWish? 'fill-accent text-accent':'text-foreground')}/>
        </button>
        {p.onSale && <Badge className="absolute top-3 left-3 rounded-none bg-accent text-accent-foreground">Sale</Badge>}
      </div>
      <div className="mt-4 space-y-1">
        <div className="text-[10px] tracking-editorial uppercase text-muted-foreground">{p.collection}</div>
        <div className="font-serif text-lg leading-tight">{p.name}</div>
        <div className="text-sm">
          {p.salePrice ? <><span className="text-accent">{money(p.salePrice, settings.currencySymbol)}</span> <span className="line-through text-muted-foreground ml-2">{money(p.price, settings.currencySymbol)}</span></> : money(p.price, settings.currencySymbol)}
        </div>
        {p.colors?.length > 0 && (
          <div className="flex gap-1 pt-1">
            {p.colors.slice(0,5).map(c => <span key={c} title={c} className="w-2.5 h-2.5 rounded-full border border-border" style={{background: colorHex(c)}}/>)}
            {p.colors.length > 5 && <span className="text-[10px] text-muted-foreground ml-1">+{p.colors.length-5}</span>}
          </div>
        )}
      </div>
    </div>
  )
}

// ---------- Shop ----------
function ShopView() {
  const { api, view, collections, allProducts } = useApp()
  const [products, setProducts] = useState([])
  const [filters, setFilters] = useState({ collection: view.params.collection || '', size: '', color: '', minPrice: '', maxPrice: '', search: '', sort: '' })
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    setLoading(true)
    const q = new URLSearchParams()
    Object.entries(filters).forEach(([k,v]) => v && q.append(k,v))
    api(`/products?${q}`).then(r => { setProducts(r.products); setLoading(false) }).catch(()=>setLoading(false))
  }, [filters, api])

  // Dynamic facets: unique colors/sizes derived from the entire catalog
  const source = allProducts.length ? allProducts : products
  const allColors = useMemo(()=>Array.from(new Set(source.flatMap(p=>p.colors||[]))).sort(), [source])
  const allSizes = useMemo(()=>Array.from(new Set(source.flatMap(p=>p.sizes||[]))).sort((a,b)=>['XS','S','M','L','XL','XXL'].indexOf(a)-['XS','S','M','L','XL','XXL'].indexOf(b)), [source])
  const filteredForCollection = filters.collection ? source.filter(p=>p.collection===filters.collection) : source
  const collectionColors = useMemo(()=>Array.from(new Set(filteredForCollection.flatMap(p=>p.colors||[]))).sort(), [filteredForCollection])

  return (
    <div className="max-w-[1400px] mx-auto px-4 md:px-8 py-12 md:py-20">
      <div className="text-center mb-12 fade-in">
        <div className="text-[11px] tracking-luxe uppercase text-accent mb-4">The Boutique</div>
        <h1 className="font-serif text-5xl md:text-6xl">{filters.collection ? collections.find(c=>c.slug===filters.collection)?.name || 'Shop' : 'Shop All'}</h1>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-[240px_1fr] gap-8 md:gap-12">
        <aside className="space-y-8">
          <div>
            <Label className="text-[11px] tracking-editorial uppercase text-muted-foreground">Search</Label>
            <Input value={filters.search} onChange={e=>setFilters(f=>({...f,search:e.target.value}))} placeholder="Search pieces..." className="mt-2 rounded-none"/>
          </div>
          <div>
            <Label className="text-[11px] tracking-editorial uppercase text-muted-foreground">Collection</Label>
            <div className="mt-3 space-y-2">
              <button onClick={()=>setFilters(f=>({...f,collection:''}))} className={cx('block text-sm', !filters.collection && 'text-accent')}>All</button>
              {collections.map(c => <button key={c.id} onClick={()=>setFilters(f=>({...f,collection:c.slug}))} className={cx('block text-sm', filters.collection===c.slug && 'text-accent')}>{c.name}</button>)}
            </div>
          </div>
          <div>
            <Label className="text-[11px] tracking-editorial uppercase text-muted-foreground">Size</Label>
            <div className="mt-3 flex flex-wrap gap-2">
              {allSizes.map(s => <button key={s} onClick={()=>setFilters(f=>({...f,size:f.size===s?'':s}))} className={cx('px-3 py-1 border text-xs', filters.size===s?'border-primary bg-primary text-primary-foreground':'border-border')}>{s}</button>)}
            </div>
          </div>
          <div>
            <Label className="text-[11px] tracking-editorial uppercase text-muted-foreground">Colour</Label>
            <div className="mt-3 space-y-1">
              {collectionColors.map(c => <button key={c} onClick={()=>setFilters(f=>({...f,color:f.color===c?'':c}))} className={cx('flex items-center gap-2 text-sm', filters.color===c && 'text-accent')}><span className="inline-block w-3 h-3 rounded-full border border-border" style={{background: colorHex(c)}}/>{c}</button>)}
              {collectionColors.length === 0 && <span className="text-xs text-muted-foreground">No colours</span>}
            </div>
          </div>
          <div>
            <Label className="text-[11px] tracking-editorial uppercase text-muted-foreground">Price (₹)</Label>
            <div className="mt-3 flex gap-2">
              <Input placeholder="Min" value={filters.minPrice} onChange={e=>setFilters(f=>({...f,minPrice:e.target.value}))} className="rounded-none"/>
              <Input placeholder="Max" value={filters.maxPrice} onChange={e=>setFilters(f=>({...f,maxPrice:e.target.value}))} className="rounded-none"/>
            </div>
          </div>
          <button onClick={()=>setFilters({ collection:'', size:'', color:'', minPrice:'', maxPrice:'', search:'', sort:'' })} className="text-xs tracking-editorial uppercase underline">Clear filters</button>
        </aside>
        <div>
          <div className="flex items-center justify-between mb-6">
            <div className="text-xs text-muted-foreground">{loading ? 'Loading...' : `${products.length} pieces`}</div>
            <Select value={filters.sort} onValueChange={v=>setFilters(f=>({...f,sort:v}))}>
              <SelectTrigger className="w-[200px] rounded-none"><SelectValue placeholder="Sort by"/></SelectTrigger>
              <SelectContent>
                <SelectItem value="newest">Newest</SelectItem>
                <SelectItem value="price_asc">Price: Low to High</SelectItem>
                <SelectItem value="price_desc">Price: High to Low</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4 md:gap-8">
            {products.map(p => <ProductCard key={p.id} p={p}/>)}
          </div>
          {!loading && products.length === 0 && <div className="text-center py-24 text-muted-foreground">No pieces match your filters.</div>}
        </div>
      </div>
    </div>
  )
}

// ---------- Product Detail ----------
function ProductView() {
  const { api, view, settings, addToCart, toggleWishlist, wishlist, navigate } = useApp()
  const [product, setProduct] = useState(null)
  const [size, setSize] = useState('')
  const [color, setColor] = useState('')
  const [activeImg, setActiveImg] = useState(0)
  const [inquiryOpen, setInquiryOpen] = useState(false)

  useEffect(() => { api(`/products/${view.params.id}`).then(r => { setProduct(r.product); setSize(r.product.sizes?.[0]||''); setColor(r.product.colors?.[0]||'') }) }, [view.params.id, api])

  if (!product) return <div className="py-32 text-center text-muted-foreground">Loading...</div>
  const inWish = wishlist.includes(product.id)

  return (
    <div className="max-w-[1400px] mx-auto px-4 md:px-8 py-8 md:py-16">
      <div className="text-xs text-muted-foreground mb-6 tracking-editorial uppercase">
        <button onClick={()=>navigate('shop')}>Shop</button> <ChevronRight className="inline w-3 h-3"/> {product.collection}
      </div>
      <div className="grid md:grid-cols-2 gap-8 md:gap-16">
        <div>
          <div className="aspect-[3/4] bg-muted overflow-hidden">
            <img src={product.images?.[activeImg]} alt={product.name} className="w-full h-full object-cover"/>
          </div>
          {product.images?.length > 1 && (
            <div className="grid grid-cols-4 gap-2 mt-2">
              {product.images.map((im,i)=>(
                <button key={i} onClick={()=>setActiveImg(i)} className={cx('aspect-[3/4] overflow-hidden', activeImg===i?'ring-2 ring-accent':'')}>
                  <img src={im} className="w-full h-full object-cover"/>
                </button>
              ))}
            </div>
          )}
        </div>
        <div className="md:sticky md:top-28 h-fit">
          <div className="text-[11px] tracking-luxe uppercase text-accent mb-3">{product.collection}</div>
          <h1 className="font-serif text-4xl md:text-5xl">{product.name}</h1>
          <div className="mt-4 text-lg">
            {product.salePrice ? <><span className="text-accent">{money(product.salePrice, settings.currencySymbol)}</span> <span className="line-through text-muted-foreground ml-2">{money(product.price, settings.currencySymbol)}</span></> : money(product.price, settings.currencySymbol)}
          </div>
          <p className="text-muted-foreground mt-6 leading-relaxed">{product.description}</p>

          <div className="mt-8">
            <div className="flex items-center justify-between mb-3">
              <Label className="text-[11px] tracking-editorial uppercase text-muted-foreground">Size</Label>
              <button className="text-[11px] tracking-editorial uppercase underline">Size Guide</button>
            </div>
            <div className="flex flex-wrap gap-2">
              {product.sizes?.map(s => <button key={s} onClick={()=>setSize(s)} className={cx('px-4 py-2 border text-xs', size===s?'border-primary bg-primary text-primary-foreground':'border-border')}>{s}</button>)}
            </div>
          </div>
          <div className="mt-6">
            <Label className="text-[11px] tracking-editorial uppercase text-muted-foreground">Colour: {color}</Label>
            <div className="mt-3 flex gap-2 flex-wrap">
              {product.colors?.map(c => (
                <button key={c} onClick={()=>setColor(c)} className={cx('flex items-center gap-2 px-3 py-2 border text-xs', color===c?'border-primary bg-primary text-primary-foreground':'border-border')}>
                  <span className="inline-block w-3.5 h-3.5 rounded-full border border-border" style={{background: colorHex(c)}}/>{c}
                </button>
              ))}
            </div>
          </div>

          <div className="mt-8 flex gap-3">
            <Button className="flex-1 rounded-none h-12 tracking-editorial uppercase text-xs" onClick={()=>addToCart(product, size, color)}>Add to Bag</Button>
            <Button variant="outline" className="rounded-none h-12 w-12 p-0" onClick={()=>toggleWishlist(product.id)}>
              <Heart className={cx('w-4 h-4', inWish && 'fill-accent text-accent')}/>
            </Button>
          </div>
          <Button variant="ghost" className="mt-3 w-full rounded-none h-12 tracking-editorial uppercase text-xs underline underline-offset-4" onClick={()=>setInquiryOpen(true)}>Enquire About This Piece</Button>

          <div className="mt-10 space-y-6 border-t border-border pt-8">
            <div>
              <div className="text-[11px] tracking-editorial uppercase text-muted-foreground mb-2">Material & Craft</div>
              <p className="text-sm">{product.material}</p>
            </div>
            <div>
              <div className="text-[11px] tracking-editorial uppercase text-muted-foreground mb-2">Care</div>
              <p className="text-sm">{product.care}</p>
            </div>
            <div className="flex gap-6 text-xs tracking-editorial uppercase text-muted-foreground">
              <div className="flex items-center gap-2"><Truck className="w-3.5 h-3.5"/> Complimentary Shipping</div>
              <div className="flex items-center gap-2"><Package className="w-3.5 h-3.5"/> SKU: {product.sku}</div>
            </div>
          </div>
        </div>
      </div>

      <InquiryDialog open={inquiryOpen} onOpenChange={setInquiryOpen} productId={product.id} productName={product.name}/>
    </div>
  )
}

function InquiryDialog({ open, onOpenChange, productId, productName }) {
  const { api } = useApp()
  const [form, setForm] = useState({ name:'', email:'', phone:'', message:'' })
  const submit = async () => {
    try {
      await api('/inquiries', { method:'POST', body: { ...form, productId, subject: productName ? `Enquiry: ${productName}` : 'General Enquiry' } })
      toast.success('Enquiry received. Our concierge will contact you.')
      onOpenChange(false); setForm({ name:'', email:'', phone:'', message:'' })
    } catch (e) { toast.error(e.message) }
  }
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="rounded-none max-w-lg">
        <DialogHeader><DialogTitle className="font-serif text-2xl">Private Enquiry</DialogTitle></DialogHeader>
        <div className="space-y-4 mt-2">
          <Input placeholder="Full Name" className="rounded-none" value={form.name} onChange={e=>setForm({...form,name:e.target.value})}/>
          <Input placeholder="Email" className="rounded-none" value={form.email} onChange={e=>setForm({...form,email:e.target.value})}/>
          <Input placeholder="Phone" className="rounded-none" value={form.phone} onChange={e=>setForm({...form,phone:e.target.value})}/>
          <Textarea placeholder="How may we assist?" rows={4} className="rounded-none" value={form.message} onChange={e=>setForm({...form,message:e.target.value})}/>
        </div>
        <DialogFooter><Button className="rounded-none tracking-editorial uppercase text-xs" onClick={submit}>Send Enquiry</Button></DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

// ---------- Cart ----------
function CartView() {
  const { cart, updateQty, removeFromCart, navigate, settings } = useApp()
  const subtotal = cart.reduce((s,x)=>s+x.price*x.qty,0)
  return (
    <div className="max-w-4xl mx-auto px-4 md:px-8 py-16">
      <h1 className="font-serif text-5xl mb-10 text-center">Your Bag</h1>
      {cart.length === 0
        ? <div className="text-center text-muted-foreground py-20">Your bag is empty. <button className="underline ml-2" onClick={()=>navigate('shop')}>Continue shopping →</button></div>
        : <>
            <div className="space-y-8">
              {cart.map(item => (
                <div key={item.key} className="grid grid-cols-[100px_1fr_auto] gap-6 pb-8 border-b border-border">
                  <img src={item.image} className="w-24 h-32 object-cover"/>
                  <div>
                    <div className="font-serif text-xl">{item.name}</div>
                    <div className="text-xs text-muted-foreground mt-1">{item.color} · Size {item.size}</div>
                    <div className="flex items-center border border-border w-fit mt-4">
                      <button className="px-3 py-2" onClick={()=>updateQty(item.key,item.qty-1)}><Minus className="w-3 h-3"/></button>
                      <span className="px-4 text-sm">{item.qty}</span>
                      <button className="px-3 py-2" onClick={()=>updateQty(item.key,item.qty+1)}><Plus className="w-3 h-3"/></button>
                    </div>
                  </div>
                  <div className="text-right">
                    <div>{money(item.price*item.qty, settings.currencySymbol)}</div>
                    <button className="text-xs text-muted-foreground mt-3 underline" onClick={()=>removeFromCart(item.key)}>Remove</button>
                  </div>
                </div>
              ))}
            </div>
            <div className="mt-12 flex justify-end">
              <div className="w-full md:w-96 space-y-4">
                <div className="flex justify-between"><span className="tracking-editorial uppercase text-xs">Subtotal</span><span>{money(subtotal, settings.currencySymbol)}</span></div>
                <div className="text-xs text-muted-foreground">Complimentary shipping applied.</div>
                <Button className="w-full rounded-none h-12 tracking-editorial uppercase text-xs" onClick={()=>navigate('checkout')}>Proceed to Checkout</Button>
              </div>
            </div>
          </>}
    </div>
  )
}

// ---------- Checkout ----------
function CheckoutView() {
  const { cart, user, settings, api, navigate, clearCart } = useApp()
  const [form, setForm] = useState({
    customerName: user?.name || '', customerEmail: user?.email || '', customerPhone: '',
    line1:'', line2:'', city:'', state:'', pincode:'', country:'India', notes:''
  })
  const [submitting, setSubmitting] = useState(false)
  const subtotal = cart.reduce((s,x)=>s+x.price*x.qty,0)
  const total = subtotal

  if (cart.length === 0) return <div className="text-center py-32 text-muted-foreground">Your bag is empty. <button className="underline ml-2" onClick={()=>navigate('shop')}>Continue shopping →</button></div>

  const submit = async () => {
    setSubmitting(true)
    try {
      const r = await api('/orders', { method:'POST', body: {
        customerName: form.customerName, customerEmail: form.customerEmail, customerPhone: form.customerPhone,
        items: cart, subtotal, shipping: 0, total,
        shippingAddress: { line1: form.line1, line2: form.line2, city: form.city, state: form.state, pincode: form.pincode, country: form.country },
        notes: form.notes,
      }})
      clearCart()
      navigate('order-success', { orderNumber: r.order.orderNumber, orderId: r.order.id })
    } catch (e) { toast.error(e.message) } finally { setSubmitting(false) }
  }

  return (
    <div className="max-w-6xl mx-auto px-4 md:px-8 py-16">
      <h1 className="font-serif text-5xl mb-10 text-center">Checkout</h1>
      <div className="grid md:grid-cols-[1fr_400px] gap-12">
        <div className="space-y-8">
          <section>
            <h2 className="font-serif text-2xl mb-4">Contact</h2>
            <div className="grid md:grid-cols-2 gap-4">
              <Input placeholder="Full Name" className="rounded-none" value={form.customerName} onChange={e=>setForm({...form,customerName:e.target.value})}/>
              <Input placeholder="Email" className="rounded-none" value={form.customerEmail} onChange={e=>setForm({...form,customerEmail:e.target.value})}/>
              <Input placeholder="Phone" className="rounded-none md:col-span-2" value={form.customerPhone} onChange={e=>setForm({...form,customerPhone:e.target.value})}/>
            </div>
          </section>
          <section>
            <h2 className="font-serif text-2xl mb-4">Shipping Address</h2>
            <div className="grid md:grid-cols-2 gap-4">
              <Input placeholder="Address Line 1" className="rounded-none md:col-span-2" value={form.line1} onChange={e=>setForm({...form,line1:e.target.value})}/>
              <Input placeholder="Address Line 2 (optional)" className="rounded-none md:col-span-2" value={form.line2} onChange={e=>setForm({...form,line2:e.target.value})}/>
              <Input placeholder="City" className="rounded-none" value={form.city} onChange={e=>setForm({...form,city:e.target.value})}/>
              <Input placeholder="State" className="rounded-none" value={form.state} onChange={e=>setForm({...form,state:e.target.value})}/>
              <Input placeholder="PIN Code" className="rounded-none" value={form.pincode} onChange={e=>setForm({...form,pincode:e.target.value})}/>
              <Input placeholder="Country" className="rounded-none" value={form.country} onChange={e=>setForm({...form,country:e.target.value})}/>
            </div>
          </section>
          <section>
            <h2 className="font-serif text-2xl mb-4">Notes for the Atelier</h2>
            <Textarea rows={3} className="rounded-none" placeholder="Gift note, preferred delivery date, etc." value={form.notes} onChange={e=>setForm({...form,notes:e.target.value})}/>
          </section>
        </div>
        <aside className="bg-muted/40 p-8">
          <h2 className="font-serif text-2xl mb-6">Order Summary</h2>
          <div className="space-y-4 pb-6 border-b border-border">
            {cart.map(item => (
              <div key={item.key} className="flex gap-3 items-center">
                <img src={item.image} className="w-14 h-20 object-cover"/>
                <div className="flex-1 text-sm">
                  <div>{item.name}</div>
                  <div className="text-xs text-muted-foreground">{item.color} · {item.size} · x{item.qty}</div>
                </div>
                <div className="text-sm">{money(item.price*item.qty, settings.currencySymbol)}</div>
              </div>
            ))}
          </div>
          <div className="pt-6 space-y-2 text-sm">
            <div className="flex justify-between"><span>Subtotal</span><span>{money(subtotal, settings.currencySymbol)}</span></div>
            <div className="flex justify-between"><span>Shipping</span><span className="text-accent">Complimentary</span></div>
            <div className="flex justify-between font-serif text-lg pt-3 border-t border-border"><span>Total</span><span>{money(total, settings.currencySymbol)}</span></div>
          </div>
          <div className="mt-6 text-xs text-muted-foreground bg-background/70 p-4 border border-border">
            Payment is arranged privately by our concierge after your order is confirmed. Submitting this form places a reserved enquiry with the atelier.
          </div>
          <Button disabled={submitting} className="w-full rounded-none h-12 tracking-editorial uppercase text-xs mt-6" onClick={submit}>{submitting?'Submitting…':'Place Enquiry Order'}</Button>
        </aside>
      </div>
    </div>
  )
}

function OrderSuccessView() {
  const { view, navigate } = useApp()
  return (
    <div className="max-w-2xl mx-auto text-center py-32 px-6">
      <div className="w-16 h-16 mx-auto rounded-full border border-accent flex items-center justify-center mb-8"><Check className="w-6 h-6 text-accent"/></div>
      <h1 className="font-serif text-5xl mb-4">Thank you.</h1>
      <p className="text-muted-foreground mb-2">Your enquiry order has been received.</p>
      <p className="text-sm mb-8">Order reference: <span className="tracking-editorial">{view.params.orderNumber}</span></p>
      <p className="text-sm text-muted-foreground mb-10">A member of our concierge will contact you within one business day to confirm details and arrange payment privately.</p>
      <div className="flex gap-3 justify-center">
        <Button className="rounded-none tracking-editorial uppercase text-xs h-12 px-8" onClick={()=>navigate('shop')}>Continue Shopping</Button>
        <Button variant="outline" className="rounded-none tracking-editorial uppercase text-xs h-12 px-8" onClick={()=>navigate('dashboard')}>View Orders</Button>
      </div>
    </div>
  )
}

// ---------- Auth ----------
function AuthLayout({ title, sub, children }) {
  return (
    <div className="max-w-md mx-auto px-4 py-24">
      <div className="text-center mb-10">
        <div className="text-[11px] tracking-luxe uppercase text-accent mb-4">YASH Maison</div>
        <h1 className="font-serif text-4xl">{title}</h1>
        {sub && <p className="text-muted-foreground mt-2 text-sm">{sub}</p>}
      </div>
      {children}
    </div>
  )
}

function LoginView() {
  const { api, setAuth, navigate } = useApp()
  const [form, setForm] = useState({ email:'', password:'' })
  const submit = async () => {
    try { const r = await api('/auth/login', { method:'POST', body: form }); setAuth(r.token, r.user); toast.success(`Welcome, ${r.user.name}`); navigate(r.user.role==='admin'?'admin':'dashboard') }
    catch (e) { toast.error(e.message) }
  }
  return (
    <AuthLayout title="Sign In" sub="Access your private account">
      <div className="space-y-4">
        <Input placeholder="Email" className="rounded-none h-12" value={form.email} onChange={e=>setForm({...form,email:e.target.value})}/>
        <Input type="password" placeholder="Password" className="rounded-none h-12" value={form.password} onChange={e=>setForm({...form,password:e.target.value})}/>
        <Button className="w-full rounded-none h-12 tracking-editorial uppercase text-xs" onClick={submit}>Sign In</Button>
        <div className="flex justify-between text-xs pt-2">
          <button className="underline" onClick={()=>navigate('forgot')}>Forgot password?</button>
          <button className="underline" onClick={()=>navigate('register')}>Create an account</button>
        </div>
      </div>
    </AuthLayout>
  )
}

function AdminLoginView() {
  const { api, setAuth, navigate } = useApp()
  const [form, setForm] = useState({ email:'', password:'' })
  const [loading, setLoading] = useState(false)
  const submit = async () => {
    setLoading(true)
    try {
      const r = await api('/auth/login', { method:'POST', body: form })
      if (r.user.role !== 'admin') { toast.error('This portal is restricted to atelier staff.'); setLoading(false); return }
      setAuth(r.token, r.user)
      if (typeof window !== 'undefined') history.replaceState(null, '', window.location.pathname)
      toast.success('Welcome to the Atelier'); navigate('admin')
    } catch (e) { toast.error(e.message) } finally { setLoading(false) }
  }
  return (
    <div className="min-h-screen -mt-20 bg-primary text-primary-foreground flex items-center justify-center px-4">
      <div className="max-w-md w-full">
        <div className="text-center mb-10">
          <div className="text-[11px] tracking-luxe uppercase text-accent mb-4">Restricted Access</div>
          <h1 className="font-serif text-5xl">Atelier Portal</h1>
          <p className="text-primary-foreground/60 mt-3 text-sm">This entrance is reserved for members of the YASH atelier.</p>
        </div>
        <div className="space-y-4">
          <Input placeholder="Atelier Email" className="rounded-none h-12 bg-transparent border-primary-foreground/30 text-primary-foreground placeholder:text-primary-foreground/50" value={form.email} onChange={e=>setForm({...form,email:e.target.value})}/>
          <Input type="password" placeholder="Password" className="rounded-none h-12 bg-transparent border-primary-foreground/30 text-primary-foreground placeholder:text-primary-foreground/50" value={form.password} onChange={e=>setForm({...form,password:e.target.value})}/>
          <Button disabled={loading} className="w-full rounded-none h-12 tracking-editorial uppercase text-xs bg-accent text-accent-foreground hover:bg-accent/90" onClick={submit}>{loading?'Entering…':'Enter Atelier'}</Button>
          <button className="text-[11px] tracking-editorial uppercase text-primary-foreground/50 mx-auto block mt-6" onClick={()=>{ if (typeof window!=='undefined') history.replaceState(null,'',window.location.pathname); navigate('home')}}>← Return to Boutique</button>
        </div>
      </div>
    </div>
  )
}

function RegisterView() {
  const { api, setAuth, navigate } = useApp()
  const [form, setForm] = useState({ name:'', email:'', password:'' })
  const submit = async () => {
    try { const r = await api('/auth/register', { method:'POST', body: form }); setAuth(r.token, r.user); toast.success('Welcome to YASH'); navigate('dashboard') }
    catch (e) { toast.error(e.message) }
  }
  return (
    <AuthLayout title="Create Account" sub="Join our private clientele">
      <div className="space-y-4">
        <Input placeholder="Full Name" className="rounded-none h-12" value={form.name} onChange={e=>setForm({...form,name:e.target.value})}/>
        <Input placeholder="Email" className="rounded-none h-12" value={form.email} onChange={e=>setForm({...form,email:e.target.value})}/>
        <Input type="password" placeholder="Password" className="rounded-none h-12" value={form.password} onChange={e=>setForm({...form,password:e.target.value})}/>
        <Button className="w-full rounded-none h-12 tracking-editorial uppercase text-xs" onClick={submit}>Create Account</Button>
        <div className="text-xs text-center pt-2"><button className="underline" onClick={()=>navigate('login')}>Already have an account?</button></div>
      </div>
    </AuthLayout>
  )
}

function ForgotView() {
  const { api, navigate } = useApp()
  const [email, setEmail] = useState('')
  const [token, setToken] = useState('')
  const submit = async () => {
    try { const r = await api('/auth/forgot', { method:'POST', body: { email } })
      if (r.mockedResetToken) { setToken(r.mockedResetToken); toast.success('Reset token generated (email mocked)') }
      else toast.success(r.message)
    } catch (e) { toast.error(e.message) }
  }
  return (
    <AuthLayout title="Password Recovery" sub="We will send you a private link">
      <div className="space-y-4">
        <Input placeholder="Email" className="rounded-none h-12" value={email} onChange={e=>setEmail(e.target.value)}/>
        <Button className="w-full rounded-none h-12 tracking-editorial uppercase text-xs" onClick={submit}>Send Reset Link</Button>
        {token && (
          <div className="text-xs bg-muted/40 p-4 border border-border">
            <div className="tracking-editorial uppercase mb-2 text-accent">Mocked Email — copy this token</div>
            <div className="font-mono break-all mb-3">{token}</div>
            <Button variant="outline" className="rounded-none w-full" onClick={()=>{navigator.clipboard.writeText(token); navigate('reset')}}>Copy & Continue →</Button>
          </div>
        )}
        <div className="text-xs text-center"><button className="underline" onClick={()=>navigate('login')}>Back to sign in</button></div>
      </div>
    </AuthLayout>
  )
}

function ResetView() {
  const { api, navigate } = useApp()
  const [form, setForm] = useState({ token:'', newPassword:'' })
  const submit = async () => {
    try { await api('/auth/reset', { method:'POST', body: form }); toast.success('Password reset. Please sign in.'); navigate('login') }
    catch (e) { toast.error(e.message) }
  }
  return (
    <AuthLayout title="Set New Password">
      <div className="space-y-4">
        <Input placeholder="Reset Token (paste)" className="rounded-none h-12 font-mono text-xs" value={form.token} onChange={e=>setForm({...form,token:e.target.value})}/>
        <Input type="password" placeholder="New Password" className="rounded-none h-12" value={form.newPassword} onChange={e=>setForm({...form,newPassword:e.target.value})}/>
        <Button className="w-full rounded-none h-12 tracking-editorial uppercase text-xs" onClick={submit}>Reset Password</Button>
      </div>
    </AuthLayout>
  )
}

// ---------- Concierge / About ----------
function ConciergeView() {
  const { settings, api } = useApp()
  const [form, setForm] = useState({ name:'', email:'', phone:'', subject:'', message:'' })
  const submit = async () => {
    try { await api('/inquiries', { method:'POST', body: form }); toast.success('Your enquiry has been received.'); setForm({ name:'', email:'', phone:'', subject:'', message:'' }) }
    catch (e) { toast.error(e.message) }
  }
  return (
    <div className="max-w-3xl mx-auto px-4 py-24">
      <div className="text-center mb-12">
        <div className="text-[11px] tracking-luxe uppercase text-accent mb-4">{settings.concierge?.eyebrow || 'Private Concierge'}</div>
        <h1 className="font-serif text-5xl">{settings.concierge?.title || 'Concierge'}</h1>
        <p className="text-muted-foreground mt-4">{settings.concierge?.subtitle}</p>
      </div>
      <div className="grid md:grid-cols-2 gap-8 mb-12 text-sm">
        <div className="border border-border p-6">
          <div className="text-[11px] tracking-editorial uppercase text-muted-foreground mb-2">{settings.concierge?.emailLabel || 'Write to us'}</div>
          <div>{settings.concierge?.email}</div>
        </div>
        <div className="border border-border p-6">
          <div className="text-[11px] tracking-editorial uppercase text-muted-foreground mb-2">{settings.concierge?.phoneLabel || 'By Telephone'}</div>
          <div>{settings.concierge?.phone}</div>
        </div>
      </div>
      <div className="space-y-4">
        <Input placeholder="Full Name" className="rounded-none h-12" value={form.name} onChange={e=>setForm({...form,name:e.target.value})}/>
        <div className="grid md:grid-cols-2 gap-4">
          <Input placeholder="Email" className="rounded-none h-12" value={form.email} onChange={e=>setForm({...form,email:e.target.value})}/>
          <Input placeholder="Phone" className="rounded-none h-12" value={form.phone} onChange={e=>setForm({...form,phone:e.target.value})}/>
        </div>
        <Input placeholder="Subject" className="rounded-none h-12" value={form.subject} onChange={e=>setForm({...form,subject:e.target.value})}/>
        <Textarea placeholder="How may we assist?" rows={6} className="rounded-none" value={form.message} onChange={e=>setForm({...form,message:e.target.value})}/>
        <Button className="rounded-none h-12 tracking-editorial uppercase text-xs px-10" onClick={submit}>Send Enquiry</Button>
      </div>
    </div>
  )
}

function AboutView() {
  const { settings } = useApp()
  return (
    <div className="max-w-3xl mx-auto py-24 px-6 text-center">
      <div className="text-[11px] tracking-luxe uppercase text-accent mb-6">Maison</div>
      <h1 className="font-serif text-5xl mb-6">{settings.aboutTitle}</h1>
      <div className="divider-gold mx-auto w-32 mb-8"/>
      <p className="text-muted-foreground leading-relaxed">{settings.aboutBody}</p>
    </div>
  )
}

// ---------- Customer Dashboard ----------
function DashboardView() {
  const { user, api, navigate, setAuth, settings } = useApp()
  const [orders, setOrders] = useState([])
  const [wishlistData, setWishlistData] = useState([])
  const [addresses, setAddresses] = useState([])
  const [tab, setTab] = useState('orders')

  useEffect(() => {
    if (!user) { navigate('login'); return }
    api('/orders').then(r=>setOrders(r.orders||[]))
    api('/wishlist').then(r=>setWishlistData(r.products||[]))
    api('/addresses').then(r=>setAddresses(r.addresses||[]))
  }, [user])

  if (!user) return null

  return (
    <div className="max-w-6xl mx-auto px-4 md:px-8 py-16">
      <div className="flex items-end justify-between mb-10">
        <div>
          <div className="text-[11px] tracking-luxe uppercase text-accent mb-2">Private Account</div>
          <h1 className="font-serif text-5xl">Welcome, {user.name}</h1>
        </div>
        <button className="text-xs tracking-editorial uppercase underline flex items-center gap-2" onClick={()=>{setAuth(null,null); navigate('home')}}><LogOut className="w-3.5 h-3.5"/> Sign Out</button>
      </div>
      <Tabs value={tab} onValueChange={setTab}>
        <TabsList className="bg-transparent border-b border-border w-full justify-start rounded-none h-auto p-0">
          {['orders','wishlist','addresses'].map(t => (
            <TabsTrigger key={t} value={t} className="rounded-none data-[state=active]:bg-transparent data-[state=active]:border-b-2 data-[state=active]:border-accent tracking-editorial uppercase text-xs px-6 py-3">{t}</TabsTrigger>
          ))}
        </TabsList>
        <TabsContent value="orders" className="pt-8">
          {orders.length === 0
            ? <div className="text-muted-foreground text-sm py-12 text-center">No orders yet.</div>
            : <div className="space-y-6">
                {orders.map(o => (
                  <div key={o.id} className="border border-border p-6">
                    <div className="flex flex-wrap items-start justify-between gap-4 mb-4">
                      <div>
                        <div className="text-[11px] tracking-editorial uppercase text-muted-foreground">Order</div>
                        <div className="font-serif text-2xl">{o.orderNumber}</div>
                        <div className="text-xs text-muted-foreground mt-1">Placed {new Date(o.createdAt).toLocaleDateString()}</div>
                      </div>
                      <div className="text-right">
                        <Badge className="rounded-none bg-accent text-accent-foreground">{o.status}</Badge>
                        {o.trackingNumber && <div className="text-xs mt-2">Tracking: {o.trackingNumber}</div>}
                        <div className="text-lg mt-2">{money(o.total, settings.currencySymbol)}</div>
                      </div>
                    </div>
                    <div className="grid md:grid-cols-2 gap-3">
                      {o.items?.map(it => (
                        <div key={it.key} className="flex gap-3 text-sm items-center">
                          <img src={it.image} className="w-12 h-16 object-cover"/>
                          <div>
                            <div>{it.name}</div>
                            <div className="text-xs text-muted-foreground">{it.color} · {it.size} · x{it.qty}</div>
                          </div>
                        </div>
                      ))}
                    </div>
                    {o.history?.length > 0 && (
                      <div className="mt-4 pt-4 border-t border-border">
                        <div className="text-[11px] tracking-editorial uppercase text-muted-foreground mb-2">Tracking</div>
                        <div className="space-y-1 text-xs">
                          {o.history.map((h,i)=>(<div key={i} className="flex gap-3"><span className="text-accent">●</span><span>{h.status}</span><span className="text-muted-foreground">{new Date(h.at).toLocaleString()}</span></div>))}
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>}
        </TabsContent>
        <TabsContent value="wishlist" className="pt-8">
          {wishlistData.length === 0
            ? <div className="text-muted-foreground text-sm py-12 text-center">Your wishlist is empty.</div>
            : <div className="grid grid-cols-2 md:grid-cols-4 gap-6">{wishlistData.map(p=><ProductCard key={p.id} p={p}/>)}</div>}
        </TabsContent>
        <TabsContent value="addresses" className="pt-8">
          <AddressManager addresses={addresses} setAddresses={setAddresses}/>
        </TabsContent>
      </Tabs>
    </div>
  )
}

function AddressManager({ addresses, setAddresses }) {
  const { api } = useApp()
  const [editing, setEditing] = useState(null)
  const empty = { label:'', line1:'', line2:'', city:'', state:'', pincode:'', country:'India' }
  const save = async () => {
    try {
      if (editing.id) { await api(`/addresses/${editing.id}`, { method:'PUT', body: editing }) }
      else { const r = await api('/addresses', { method:'POST', body: editing }); setAddresses(a=>[...a, r.address]); setEditing(null); return }
      const r = await api('/addresses'); setAddresses(r.addresses); setEditing(null)
    } catch (e) { toast.error(e.message) }
  }
  const remove = async (id) => { await api(`/addresses/${id}`, { method:'DELETE' }); setAddresses(a=>a.filter(x=>x.id!==id)) }
  return (
    <div>
      <div className="flex justify-end mb-4"><Button variant="outline" className="rounded-none tracking-editorial uppercase text-xs" onClick={()=>setEditing({...empty})}><Plus className="w-3.5 h-3.5 mr-2"/>Add Address</Button></div>
      <div className="grid md:grid-cols-2 gap-4">
        {addresses.map(a => (
          <div key={a.id} className="border border-border p-6">
            <div className="font-serif text-xl mb-1">{a.label || 'Address'}</div>
            <div className="text-sm text-muted-foreground">{a.line1}{a.line2?`, ${a.line2}`:''}<br/>{a.city}, {a.state} {a.pincode}<br/>{a.country}</div>
            <div className="flex gap-3 mt-4 text-xs tracking-editorial uppercase">
              <button className="underline" onClick={()=>setEditing(a)}>Edit</button>
              <button className="underline" onClick={()=>remove(a.id)}>Delete</button>
            </div>
          </div>
        ))}
        {addresses.length === 0 && <div className="text-muted-foreground text-sm py-8 col-span-2 text-center">No saved addresses.</div>}
      </div>
      <Dialog open={!!editing} onOpenChange={o=>!o&&setEditing(null)}>
        <DialogContent className="rounded-none max-w-lg">
          <DialogHeader><DialogTitle className="font-serif text-2xl">{editing?.id?'Edit Address':'Add Address'}</DialogTitle></DialogHeader>
          {editing && <div className="space-y-3">
            <Input placeholder="Label (Home, Office)" className="rounded-none" value={editing.label} onChange={e=>setEditing({...editing,label:e.target.value})}/>
            <Input placeholder="Address Line 1" className="rounded-none" value={editing.line1} onChange={e=>setEditing({...editing,line1:e.target.value})}/>
            <Input placeholder="Address Line 2" className="rounded-none" value={editing.line2} onChange={e=>setEditing({...editing,line2:e.target.value})}/>
            <div className="grid grid-cols-2 gap-3">
              <Input placeholder="City" className="rounded-none" value={editing.city} onChange={e=>setEditing({...editing,city:e.target.value})}/>
              <Input placeholder="State" className="rounded-none" value={editing.state} onChange={e=>setEditing({...editing,state:e.target.value})}/>
              <Input placeholder="PIN" className="rounded-none" value={editing.pincode} onChange={e=>setEditing({...editing,pincode:e.target.value})}/>
              <Input placeholder="Country" className="rounded-none" value={editing.country} onChange={e=>setEditing({...editing,country:e.target.value})}/>
            </div>
          </div>}
          <DialogFooter><Button className="rounded-none tracking-editorial uppercase text-xs" onClick={save}>Save</Button></DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

// ---------- Admin ----------
function AdminView() {
  const { user, api, navigate, setAuth } = useApp()
  const [tab, setTab] = useState('overview')
  useEffect(()=>{ if (!user || user.role !== 'admin') { toast.error('Admin only'); navigate('login') } }, [user])
  if (!user || user.role !== 'admin') return null
  return (
    <div className="max-w-[1400px] mx-auto px-4 md:px-8 py-12">
      <div className="flex items-end justify-between mb-8">
        <div>
          <div className="text-[11px] tracking-luxe uppercase text-accent mb-2">CMS · Atelier</div>
          <h1 className="font-serif text-5xl">Admin Studio</h1>
        </div>
        <button className="text-xs tracking-editorial uppercase underline flex items-center gap-2" onClick={()=>{setAuth(null,null); navigate('home')}}><LogOut className="w-3.5 h-3.5"/>Sign Out</button>
      </div>
      <Tabs value={tab} onValueChange={setTab}>
        <TabsList className="bg-transparent border-b border-border w-full justify-start rounded-none h-auto p-0 flex-wrap">
          {['overview','products','collections','orders','inquiries','settings'].map(t=>(
            <TabsTrigger key={t} value={t} className="rounded-none data-[state=active]:bg-transparent data-[state=active]:border-b-2 data-[state=active]:border-accent tracking-editorial uppercase text-xs px-6 py-3">{t}</TabsTrigger>
          ))}
        </TabsList>
        <TabsContent value="overview" className="pt-8"><AdminOverview/></TabsContent>
        <TabsContent value="products" className="pt-8"><AdminProducts/></TabsContent>
        <TabsContent value="collections" className="pt-8"><AdminCollections/></TabsContent>
        <TabsContent value="orders" className="pt-8"><AdminOrders/></TabsContent>
        <TabsContent value="inquiries" className="pt-8"><AdminInquiries/></TabsContent>
        <TabsContent value="settings" className="pt-8"><AdminSettings/></TabsContent>
      </Tabs>
    </div>
  )
}

function StatCard({ label, value }) {
  return <div className="border border-border p-8">
    <div className="text-[11px] tracking-editorial uppercase text-muted-foreground">{label}</div>
    <div className="font-serif text-5xl mt-2">{value}</div>
  </div>
}
function AdminOverview() {
  const { api } = useApp()
  const [data, setData] = useState(null)
  useEffect(()=>{ api('/admin/overview').then(setData) }, [])
  if (!data) return <div className="text-muted-foreground">Loading...</div>
  return (
    <div>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard label="Products" value={data.productCount}/>
        <StatCard label="Orders" value={data.orderCount}/>
        <StatCard label="New Enquiries" value={data.inquiryCount}/>
        <StatCard label="Clients" value={data.userCount}/>
      </div>
      {data.lowStock?.length > 0 && (
        <div className="mt-10">
          <h3 className="font-serif text-2xl mb-4">Low Stock Alerts</h3>
          <div className="space-y-2">
            {data.lowStock.map(p => (
              <div key={p.id} className="flex items-center justify-between border border-border p-4">
                <div className="flex items-center gap-3"><img src={p.images?.[0]} className="w-10 h-14 object-cover"/><span>{p.name}</span></div>
                <Badge className="rounded-none bg-destructive text-destructive-foreground">Stock: {p.stock}</Badge>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

function AdminProducts() {
  const { api, collections } = useApp()
  const [products, setProducts] = useState([])
  const [editing, setEditing] = useState(null)
  const reload = () => api('/products').then(r=>setProducts(r.products))
  useEffect(()=>{ reload() }, [])
  const empty = { name:'', description:'', collection:'womenswear', price:0, salePrice:'', onSale:false, sku:'', stock:0, images:[''], sizes:['XS','S','M','L','XL'], colors:['Noir','Ivory','Champagne'], material:'', care:'', featured:false, lowStockThreshold:3 }
  const save = async () => {
    try {
      const body = { ...editing, images: editing.images.filter(Boolean) }
      if (editing.id) await api(`/products/${editing.id}`, { method:'PUT', body })
      else await api('/products', { method:'POST', body })
      toast.success('Saved'); setEditing(null); reload()
    } catch (e) { toast.error(e.message) }
  }
  const remove = async (id) => { if (!confirm('Delete this product?')) return; await api(`/products/${id}`, { method:'DELETE' }); reload() }
  return (
    <div>
      <div className="flex justify-between mb-6">
        <h3 className="font-serif text-2xl">Products ({products.length})</h3>
        <Button className="rounded-none tracking-editorial uppercase text-xs" onClick={()=>setEditing({...empty})}><Plus className="w-3.5 h-3.5 mr-2"/>New Product</Button>
      </div>
      <div className="grid gap-2">
        {products.map(p => (
          <div key={p.id} className="grid grid-cols-[60px_1fr_auto_auto_auto] gap-4 items-center border border-border p-3">
            <img src={p.images?.[0]} className="w-14 h-16 object-cover"/>
            <div>
              <div className="font-serif text-lg">{p.name}</div>
              <div className="text-xs text-muted-foreground">{p.collection} · SKU {p.sku}</div>
            </div>
            <div className="text-sm">₹{p.price.toLocaleString('en-IN')}</div>
            <Badge className={cx('rounded-none', p.stock<=p.lowStockThreshold?'bg-destructive text-destructive-foreground':'bg-muted text-foreground')}>Stock {p.stock}</Badge>
            <div className="flex gap-2">
              <Button size="sm" variant="outline" className="rounded-none" onClick={()=>setEditing({...p, images: p.images?.length?p.images:['']})}><Edit3 className="w-3.5 h-3.5"/></Button>
              <Button size="sm" variant="outline" className="rounded-none" onClick={()=>remove(p.id)}><Trash2 className="w-3.5 h-3.5"/></Button>
            </div>
          </div>
        ))}
      </div>
      <Dialog open={!!editing} onOpenChange={o=>!o&&setEditing(null)}>
        <DialogContent className="rounded-none max-w-2xl max-h-[85vh] overflow-y-auto">
          <DialogHeader><DialogTitle className="font-serif text-2xl">{editing?.id?'Edit Product':'New Product'}</DialogTitle></DialogHeader>
          {editing && <div className="space-y-4">
            <Input placeholder="Name" className="rounded-none" value={editing.name} onChange={e=>setEditing({...editing,name:e.target.value})}/>
            <Textarea placeholder="Description" rows={3} className="rounded-none" value={editing.description} onChange={e=>setEditing({...editing,description:e.target.value})}/>
            <div className="grid grid-cols-2 gap-3">
              <Select value={editing.collection} onValueChange={v=>setEditing({...editing,collection:v})}>
                <SelectTrigger className="rounded-none"><SelectValue/></SelectTrigger>
                <SelectContent>{collections.map(c=><SelectItem key={c.id} value={c.slug}>{c.name}</SelectItem>)}</SelectContent>
              </Select>
              <Input placeholder="SKU" className="rounded-none" value={editing.sku} onChange={e=>setEditing({...editing,sku:e.target.value})}/>
              <Input type="number" placeholder="Price (₹)" className="rounded-none" value={editing.price} onChange={e=>setEditing({...editing,price:e.target.value})}/>
              <Input type="number" placeholder="Sale Price (optional)" className="rounded-none" value={editing.salePrice||''} onChange={e=>setEditing({...editing,salePrice:e.target.value})}/>
              <Input type="number" placeholder="Stock" className="rounded-none" value={editing.stock} onChange={e=>setEditing({...editing,stock:e.target.value})}/>
              <Input type="number" placeholder="Low stock threshold" className="rounded-none" value={editing.lowStockThreshold} onChange={e=>setEditing({...editing,lowStockThreshold:e.target.value})}/>
            </div>
            <div>
              <Label className="text-xs">Images (URLs)</Label>
              {editing.images.map((img,i)=>(
                <div key={i} className="flex gap-2 mt-2">
                  <Input className="rounded-none" value={img} onChange={e=>{const a=[...editing.images]; a[i]=e.target.value; setEditing({...editing,images:a})}}/>
                  <Button variant="outline" size="sm" className="rounded-none" onClick={()=>{const a=editing.images.filter((_,x)=>x!==i); setEditing({...editing,images:a.length?a:['']})}}><X className="w-3.5 h-3.5"/></Button>
                </div>
              ))}
              <Button variant="outline" size="sm" className="rounded-none mt-2" onClick={()=>setEditing({...editing, images:[...editing.images,'']})}>+ Add Image</Button>
            </div>
            <Input placeholder="Sizes (comma separated)" className="rounded-none" value={editing.sizes.join(',')} onChange={e=>setEditing({...editing,sizes:e.target.value.split(',').map(s=>s.trim()).filter(Boolean)})}/>
            <Input placeholder="Colors (comma separated)" className="rounded-none" value={editing.colors.join(',')} onChange={e=>setEditing({...editing,colors:e.target.value.split(',').map(s=>s.trim()).filter(Boolean)})}/>
            <Textarea placeholder="Material & Craft" rows={2} className="rounded-none" value={editing.material} onChange={e=>setEditing({...editing,material:e.target.value})}/>
            <Textarea placeholder="Care instructions" rows={2} className="rounded-none" value={editing.care} onChange={e=>setEditing({...editing,care:e.target.value})}/>
            <div className="flex gap-6">
              <label className="flex items-center gap-2 text-sm"><Switch checked={editing.featured} onCheckedChange={v=>setEditing({...editing,featured:v})}/> Featured</label>
              <label className="flex items-center gap-2 text-sm"><Switch checked={editing.onSale} onCheckedChange={v=>setEditing({...editing,onSale:v})}/> On Sale</label>
            </div>
          </div>}
          <DialogFooter><Button className="rounded-none tracking-editorial uppercase text-xs" onClick={save}>Save</Button></DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

function AdminCollections() {
  const { api, collections, setCollections } = useApp()
  const [editing, setEditing] = useState(null)
  const reload = () => api('/collections').then(r=>setCollections(r.collections))
  const save = async () => {
    try {
      if (editing.id) await api(`/collections/${editing.id}`, { method:'PUT', body: editing })
      else await api('/collections', { method:'POST', body: editing })
      toast.success('Saved'); setEditing(null); reload()
    } catch (e) { toast.error(e.message) }
  }
  const remove = async (id) => { if (!confirm('Delete?')) return; await api(`/collections/${id}`, { method:'DELETE' }); reload() }
  return (
    <div>
      <div className="flex justify-between mb-6"><h3 className="font-serif text-2xl">Collections</h3><Button className="rounded-none tracking-editorial uppercase text-xs" onClick={()=>setEditing({name:'',slug:'',image:'',description:'',order:collections.length+1})}><Plus className="w-3.5 h-3.5 mr-2"/>New</Button></div>
      <div className="grid md:grid-cols-3 gap-4">
        {collections.map(c => (
          <div key={c.id} className="border border-border p-4">
            <img src={c.image} className="w-full aspect-video object-cover mb-3"/>
            <div className="font-serif text-xl">{c.name}</div>
            <div className="text-xs text-muted-foreground">{c.slug}</div>
            <div className="flex gap-2 mt-3">
              <Button size="sm" variant="outline" className="rounded-none" onClick={()=>setEditing(c)}>Edit</Button>
              <Button size="sm" variant="outline" className="rounded-none" onClick={()=>remove(c.id)}>Delete</Button>
            </div>
          </div>
        ))}
      </div>
      <Dialog open={!!editing} onOpenChange={o=>!o&&setEditing(null)}>
        <DialogContent className="rounded-none">
          <DialogHeader><DialogTitle className="font-serif text-2xl">{editing?.id?'Edit':'New'} Collection</DialogTitle></DialogHeader>
          {editing && <div className="space-y-3">
            <Input placeholder="Name" className="rounded-none" value={editing.name} onChange={e=>setEditing({...editing,name:e.target.value})}/>
            <Input placeholder="Slug" className="rounded-none" value={editing.slug} onChange={e=>setEditing({...editing,slug:e.target.value})}/>
            <Input placeholder="Image URL" className="rounded-none" value={editing.image} onChange={e=>setEditing({...editing,image:e.target.value})}/>
            <Textarea placeholder="Description" className="rounded-none" value={editing.description} onChange={e=>setEditing({...editing,description:e.target.value})}/>
            <Input type="number" placeholder="Order" className="rounded-none" value={editing.order} onChange={e=>setEditing({...editing,order:e.target.value})}/>
          </div>}
          <DialogFooter><Button className="rounded-none" onClick={save}>Save</Button></DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

function AdminOrders() {
  const { api, settings } = useApp()
  const [orders, setOrders] = useState([])
  const [editing, setEditing] = useState(null)
  const reload = () => api('/orders').then(r=>setOrders(r.orders||[]))
  useEffect(()=>{ reload() }, [])
  const statuses = ['Enquiry Received','Confirmed','Processing','Shipped','Delivered','Cancelled']
  const save = async () => {
    try { await api(`/orders/${editing.id}`, { method:'PUT', body: { status: editing.status, trackingNumber: editing.trackingNumber, adminNotes: editing.adminNotes, historyNote: editing.historyNote } }); toast.success('Updated'); setEditing(null); reload() } catch (e) { toast.error(e.message) }
  }
  return (
    <div>
      <h3 className="font-serif text-2xl mb-6">All Orders ({orders.length})</h3>
      <div className="space-y-2">
        {orders.map(o => (
          <div key={o.id} className="grid grid-cols-[1fr_auto_auto_auto] gap-4 items-center border border-border p-4">
            <div>
              <div className="font-serif text-lg">{o.orderNumber}</div>
              <div className="text-xs text-muted-foreground">{o.customerName} · {o.customerEmail} · {new Date(o.createdAt).toLocaleDateString()}</div>
            </div>
            <div className="text-sm">{money(o.total, settings.currencySymbol)}</div>
            <Badge className="rounded-none bg-accent text-accent-foreground">{o.status}</Badge>
            <Button size="sm" variant="outline" className="rounded-none" onClick={()=>setEditing({...o, historyNote:''})}>Manage</Button>
          </div>
        ))}
        {orders.length === 0 && <div className="text-muted-foreground text-sm py-12 text-center">No orders yet.</div>}
      </div>
      <Dialog open={!!editing} onOpenChange={o=>!o&&setEditing(null)}>
        <DialogContent className="rounded-none max-w-2xl max-h-[85vh] overflow-y-auto">
          <DialogHeader><DialogTitle className="font-serif text-2xl">Order {editing?.orderNumber}</DialogTitle></DialogHeader>
          {editing && <div className="space-y-4">
            <div className="grid grid-cols-2 gap-3 text-sm">
              <div><div className="text-[11px] tracking-editorial uppercase text-muted-foreground">Customer</div>{editing.customerName}<br/>{editing.customerEmail}<br/>{editing.customerPhone}</div>
              <div><div className="text-[11px] tracking-editorial uppercase text-muted-foreground">Shipping</div>{editing.shippingAddress?.line1}<br/>{editing.shippingAddress?.city}, {editing.shippingAddress?.state} {editing.shippingAddress?.pincode}</div>
            </div>
            <div className="border-t border-border pt-4">
              <div className="text-[11px] tracking-editorial uppercase text-muted-foreground mb-2">Items</div>
              {editing.items?.map(it => <div key={it.key} className="text-sm">{it.name} · {it.color} · {it.size} · x{it.qty} — {money(it.price*it.qty, settings.currencySymbol)}</div>)}
            </div>
            <Select value={editing.status} onValueChange={v=>setEditing({...editing,status:v})}>
              <SelectTrigger className="rounded-none"><SelectValue/></SelectTrigger>
              <SelectContent>{statuses.map(s=><SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
            </Select>
            <Input placeholder="Tracking Number" className="rounded-none" value={editing.trackingNumber||''} onChange={e=>setEditing({...editing,trackingNumber:e.target.value})}/>
            <Input placeholder="History Note (optional)" className="rounded-none" value={editing.historyNote||''} onChange={e=>setEditing({...editing,historyNote:e.target.value})}/>
            <Textarea placeholder="Admin Notes" className="rounded-none" value={editing.adminNotes||''} onChange={e=>setEditing({...editing,adminNotes:e.target.value})}/>
          </div>}
          <DialogFooter><Button className="rounded-none" onClick={save}>Update</Button></DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

function AdminInquiries() {
  const { api } = useApp()
  const [items, setItems] = useState([])
  const [editing, setEditing] = useState(null)
  const reload = () => api('/inquiries').then(r=>setItems(r.inquiries||[]))
  useEffect(()=>{ reload() },[])
  const save = async () => {
    try { await api(`/inquiries/${editing.id}`, { method:'PUT', body: { status: editing.status, response: editing.response } }); toast.success('Updated'); setEditing(null); reload() } catch (e) { toast.error(e.message) }
  }
  const remove = async (id) => { if (!confirm('Delete?')) return; await api(`/inquiries/${id}`, { method:'DELETE' }); reload() }
  return (
    <div>
      <h3 className="font-serif text-2xl mb-6">Enquiries ({items.length})</h3>
      <div className="space-y-2">
        {items.map(i => (
          <div key={i.id} className="border border-border p-4">
            <div className="flex items-start justify-between gap-4">
              <div>
                <div className="font-serif text-lg">{i.subject}</div>
                <div className="text-xs text-muted-foreground">From {i.name} · {i.email} · {i.phone}</div>
                <p className="text-sm mt-2 whitespace-pre-wrap">{i.message}</p>
                {i.response && <p className="text-sm mt-3 border-l-2 border-accent pl-3 italic">{i.response}</p>}
              </div>
              <div className="flex flex-col items-end gap-2">
                <Badge className="rounded-none">{i.status}</Badge>
                <Button size="sm" variant="outline" className="rounded-none" onClick={()=>setEditing({...i})}>Reply</Button>
                <Button size="sm" variant="outline" className="rounded-none" onClick={()=>remove(i.id)}><Trash2 className="w-3.5 h-3.5"/></Button>
              </div>
            </div>
          </div>
        ))}
        {items.length === 0 && <div className="text-muted-foreground text-sm py-12 text-center">No enquiries.</div>}
      </div>
      <Dialog open={!!editing} onOpenChange={o=>!o&&setEditing(null)}>
        <DialogContent className="rounded-none">
          <DialogHeader><DialogTitle className="font-serif text-2xl">Reply to {editing?.name}</DialogTitle></DialogHeader>
          {editing && <div className="space-y-3">
            <Select value={editing.status} onValueChange={v=>setEditing({...editing,status:v})}>
              <SelectTrigger className="rounded-none"><SelectValue/></SelectTrigger>
              <SelectContent>{['New','In Progress','Answered','Closed'].map(s=><SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
            </Select>
            <Textarea placeholder="Your response" rows={5} className="rounded-none" value={editing.response||''} onChange={e=>setEditing({...editing,response:e.target.value})}/>
          </div>}
          <DialogFooter><Button className="rounded-none" onClick={save}>Save</Button></DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

function AdminSettings() {
  const { api, settings, setSettings } = useApp()
  const [form, setForm] = useState(settings)
  useEffect(()=>setForm(settings), [settings])
  const save = async () => {
    try { const r = await api('/settings', { method:'PUT', body: form }); setSettings(r.settings); toast.success('Site content updated') } catch (e) { toast.error(e.message) }
  }
  const setField = (k,v) => setForm(f=>({...f,[k]:v}))
  const setConcierge = (k,v) => setForm(f=>({...f, concierge: { ...(f.concierge||{}), [k]: v }}))
  const lookbook = form?.lookbookImages || []
  const setLookbookAt = (i,v) => setForm(f=>{ const a=[...(f.lookbookImages||[])]; a[i]=v; return {...f, lookbookImages:a} })
  const addLookbook = () => setForm(f=>({...f, lookbookImages:[...(f.lookbookImages||[]), '']}))
  const removeLookbook = (i) => setForm(f=>({...f, lookbookImages:(f.lookbookImages||[]).filter((_,x)=>x!==i)}))
  if (!form) return null
  return (
    <div className="max-w-3xl space-y-6">
      <h3 className="font-serif text-2xl">Website Editor</h3>
      <div className="space-y-3">
        <Label>Brand Name</Label><Input className="rounded-none" value={form.brand} onChange={e=>setField('brand',e.target.value)}/>
        <Label>Slogan</Label><Input className="rounded-none" value={form.slogan} onChange={e=>setField('slogan',e.target.value)}/>
        <Label>Logo URL</Label><Input className="rounded-none" value={form.logoUrl} onChange={e=>setField('logoUrl',e.target.value)}/>
        <Label>Announcement Bar</Label><Input className="rounded-none" value={form.announcement||''} onChange={e=>setField('announcement',e.target.value)}/>
      </div>
      <div className="space-y-3 border-t border-border pt-6">
        <h4 className="font-serif text-xl">Hero</h4>
        <Label>Hero Eyebrow</Label><Input className="rounded-none" value={form.heroEyebrow||''} onChange={e=>setField('heroEyebrow',e.target.value)}/>
        <Label>Hero Title</Label><Input className="rounded-none" value={form.heroTitle} onChange={e=>setField('heroTitle',e.target.value)}/>
        <Label>Hero Subtitle</Label><Textarea className="rounded-none" value={form.heroSubtitle} onChange={e=>setField('heroSubtitle',e.target.value)}/>
        <Label>Hero Image URL</Label><Input className="rounded-none" value={form.heroImage} onChange={e=>setField('heroImage',e.target.value)}/>
        <Label>Hero CTA Label</Label><Input className="rounded-none" value={form.heroCtaLabel||''} onChange={e=>setField('heroCtaLabel',e.target.value)}/>
      </div>
      <div className="space-y-3 border-t border-border pt-6">
        <h4 className="font-serif text-xl">Collections Section</h4>
        <Label>Collections Eyebrow</Label><Input className="rounded-none" value={form.collectionsEyebrow||''} onChange={e=>setField('collectionsEyebrow',e.target.value)}/>
        <Label>Collections Heading</Label><Input className="rounded-none" value={form.collectionsTitle||''} onChange={e=>setField('collectionsTitle',e.target.value)}/>
      </div>
      <div className="space-y-3 border-t border-border pt-6">
        <h4 className="font-serif text-xl">Featured Section</h4>
        <Label>Featured Eyebrow</Label><Input className="rounded-none" value={form.featuredEyebrow||''} onChange={e=>setField('featuredEyebrow',e.target.value)}/>
        <Label>Featured Heading</Label><Input className="rounded-none" value={form.featuredTitle||''} onChange={e=>setField('featuredTitle',e.target.value)}/>
        <Label>Featured Link Label</Label><Input className="rounded-none" value={form.featuredCtaLabel||''} onChange={e=>setField('featuredCtaLabel',e.target.value)}/>
      </div>
      <div className="space-y-3 border-t border-border pt-6">
        <h4 className="font-serif text-xl">About</h4>
        <Label>About Eyebrow</Label><Input className="rounded-none" value={form.aboutEyebrow||''} onChange={e=>setField('aboutEyebrow',e.target.value)}/>
        <Label>About Title</Label><Input className="rounded-none" value={form.aboutTitle} onChange={e=>setField('aboutTitle',e.target.value)}/>
        <Label>About Body</Label><Textarea rows={5} className="rounded-none" value={form.aboutBody} onChange={e=>setField('aboutBody',e.target.value)}/>
      </div>
      <div className="space-y-3 border-t border-border pt-6">
        <h4 className="font-serif text-xl">Lookbook</h4>
        <Label>Lookbook Title</Label><Input className="rounded-none" value={form.lookbookTitle} onChange={e=>setField('lookbookTitle',e.target.value)}/>
        <Label>Lookbook Subtitle</Label><Input className="rounded-none" value={form.lookbookSubtitle} onChange={e=>setField('lookbookSubtitle',e.target.value)}/>
        <Label>Home Page Images</Label>
        <div className="space-y-2">
          {lookbook.map((img,i)=>(
            <div key={i} className="flex gap-2 items-center">
              {img ? <img src={img} alt="" className="w-12 h-16 object-cover border border-border"/> : <div className="w-12 h-16 bg-muted border border-border"/>}
              <Input className="rounded-none" placeholder="Image URL" value={img} onChange={e=>setLookbookAt(i,e.target.value)}/>
              <Button variant="outline" size="sm" className="rounded-none" onClick={()=>removeLookbook(i)}><Trash2 className="w-3.5 h-3.5"/></Button>
            </div>
          ))}
          {lookbook.length === 0 && <div className="text-xs text-muted-foreground">No images yet.</div>}
          <Button variant="outline" size="sm" className="rounded-none" onClick={addLookbook}><Plus className="w-3.5 h-3.5 mr-2"/>Add Image</Button>
        </div>
      </div>
      <div className="space-y-3 border-t border-border pt-6">
        <h4 className="font-serif text-xl">Concierge Section (Home) & Page</h4>
        <Label>Home CTA Heading</Label><Input className="rounded-none" value={form.conciergeCtaTitle||''} onChange={e=>setField('conciergeCtaTitle',e.target.value)}/>
        <Label>Home CTA Button Label</Label><Input className="rounded-none" value={form.conciergeCtaLabel||''} onChange={e=>setField('conciergeCtaLabel',e.target.value)}/>
        <Label>Concierge Eyebrow</Label><Input className="rounded-none" value={form.concierge?.eyebrow||''} onChange={e=>setConcierge('eyebrow',e.target.value)}/>
        <Label>Title</Label><Input className="rounded-none" value={form.concierge?.title||''} onChange={e=>setConcierge('title',e.target.value)}/>
        <Label>Subtitle</Label><Textarea className="rounded-none" value={form.concierge?.subtitle||''} onChange={e=>setConcierge('subtitle',e.target.value)}/>
        <Label>Email Label</Label><Input className="rounded-none" value={form.concierge?.emailLabel||''} onChange={e=>setConcierge('emailLabel',e.target.value)}/>
        <Label>Email</Label><Input className="rounded-none" value={form.concierge?.email||''} onChange={e=>setConcierge('email',e.target.value)}/>
        <Label>Phone Label</Label><Input className="rounded-none" value={form.concierge?.phoneLabel||''} onChange={e=>setConcierge('phoneLabel',e.target.value)}/>
        <Label>Phone</Label><Input className="rounded-none" value={form.concierge?.phone||''} onChange={e=>setConcierge('phone',e.target.value)}/>
      </div>
      <div className="space-y-3 border-t border-border pt-6">
        <h4 className="font-serif text-xl">Footer</h4>
        <Label>Footer Copy</Label><Input className="rounded-none" value={form.footerCopy||''} onChange={e=>setField('footerCopy',e.target.value)}/>
      </div>
      <Button className="rounded-none tracking-editorial uppercase text-xs" onClick={save}>Save All Changes</Button>
    </div>
  )
}

// ---------- Footer ----------
function Footer() {
  const { settings, navigate, transparentLogo } = useApp()
  const logoSrc = transparentLogo || settings.logoUrl
  return (
    <footer className="bg-primary text-primary-foreground py-16 mt-20">
      <div className="max-w-[1400px] mx-auto px-4 md:px-8 grid md:grid-cols-3 gap-10">
        <div>
          <div className="text-[11px] tracking-editorial uppercase text-primary-foreground/60 mb-4">Boutique</div>
          <div className="space-y-2 text-sm">
            <button className="block" onClick={()=>navigate('shop')}>All Pieces</button>
            <button className="block" onClick={()=>navigate('shop',{collection:'womenswear'})}>Womenswear</button>
            <button className="block" onClick={()=>navigate('shop',{collection:'menswear'})}>Menswear</button>
            <button className="block" onClick={()=>navigate('shop',{collection:'accessories'})}>Accessories</button>
          </div>
        </div>
        <div>
          <div className="text-[11px] tracking-editorial uppercase text-primary-foreground/60 mb-4">Maison</div>
          <div className="space-y-2 text-sm">
            <button className="block" onClick={()=>navigate('about')}>The House</button>
            <button className="block" onClick={()=>navigate('concierge')}>Concierge</button>
          </div>
        </div>
        <div>
          <div className="text-[11px] tracking-editorial uppercase text-primary-foreground/60 mb-4">Contact</div>
          <div className="space-y-2 text-sm">
            <div>{settings.concierge?.email}</div>
            <div>{settings.concierge?.phone}</div>
          </div>
          <div className="flex gap-4 mt-6"><Instagram className="w-4 h-4"/><Facebook className="w-4 h-4"/><Twitter className="w-4 h-4"/></div>
        </div>
      </div>
      <div className="max-w-[1400px] mx-auto px-4 md:px-8 mt-14 pt-10 border-t border-primary-foreground/10 flex flex-col items-center gap-6">
        <img src={logoSrc} alt={settings.brand} className={cx('h-20 md:h-24 object-contain brightness-0 invert', !transparentLogo && 'mix-blend-screen')} />
        <div className="text-[11px] tracking-luxe uppercase text-primary-foreground/70">{settings.slogan}</div>
        <div className="text-[11px] tracking-editorial uppercase text-primary-foreground/50 text-center">{settings.footerCopy}</div>
      </div>
    </footer>
  )
}
