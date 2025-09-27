
import { Link, useLocation } from 'react-router-dom'
import { MessageSquare, Database, Home } from 'lucide-react'

interface SidebarProps {
  collapsed: boolean
}

const navigation = [
  { name: 'Overview', href: '/overview', icon: Home },
  { name: 'Chat SQL', href: '/chat', icon: MessageSquare },
  { name: 'SQL Query', href: '/sql', icon: Database },
]

export function Sidebar({ collapsed }: SidebarProps) {
  const location = useLocation()

  return (
    <div className={`fixed left-0 top-16 h-[calc(100vh-4rem)] bg-background border-r border-border transition-all duration-300 ${
      collapsed ? 'w-16' : 'w-64'
    }`}>
      <nav className="p-4 space-y-2">
        {navigation.map((item) => {
          const isActive = location.pathname === item.href
          const Icon = item.icon
          
          return (
            <Link
              key={item.name}
              to={item.href}
              className={`flex items-center gap-3 px-3 py-2 rounded-lg transition-colors ${
                isActive
                  ? 'bg-primary text-primary-foreground'
                  : 'text-muted-foreground hover:text-foreground hover:bg-accent'
              }`}
            >
              <Icon className="h-5 w-5 flex-shrink-0" />
              {!collapsed && (
                <span className="font-medium">{item.name}</span>
              )}
            </Link>
          )
        })}
      </nav>
    </div>
  )
}