import { NavLink, useLocation } from "react-router-dom"
import { useState } from "react"
import {
  LayoutDashboard,
  Package,
  ShoppingCart,
  Users,
  Truck,
  Settings,
  BarChart3,
  FileText,
  Star,
  Store,
  ChevronDown,
  ChevronRight,
  Headphones,
  Receipt
} from "lucide-react"

import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarMenuSub,
  SidebarMenuSubItem,
  SidebarMenuSubButton,
  SidebarHeader,
  SidebarFooter,
  useSidebar,
} from "@/components/ui/sidebar"

import {
  Collapsible,
  CollapsibleTrigger,
  CollapsibleContent,
} from "@/components/ui/collapsible"

// Simple menu items (no expansion) - organized sections
const topMenuItems = [
  {
    title: "Dashboard",
    url: "/admin",
    icon: LayoutDashboard,
    exact: true
  }
]

// Accounts group (Analytics, CA Report, All-time data)
const accountsSubItems = [
  {
    title: "All Time Data",
    url: "/admin/accounts",
    badge: null
  },
  {
    title: "Analytics",
    url: "/admin/analytics",
    badge: null
  },
  {
    title: "CA Report",
    url: "/admin/ca-report",
    badge: null
  }
]

// Bottom items (Testimonials, About, Settings)
const bottomMenuItems = [
  {
    title: "Testimonials",
    url: "/admin/testimonials",
    icon: Star,
    exact: false
  },
  {
    title: "About",
    url: "/admin/about",
    icon: FileText,
    exact: false
  },
  {
    title: "Settings",
    url: "/admin/settings",
    icon: Settings,
    exact: false
  }
]


// Orders group
const ordersSubItems = [
  {
    title: "Orders",
    url: "/admin/orders",
    badge: null
  },
  {
    title: "Vendor Orders",
    url: "/admin/vendor-orders",
    badge: null
  },
  {
    title: "Vendor Performance",
    url: "/admin/vendor-performance",
    badge: null
  },
  {
    title: "Pending/Cancelled",
    url: "/admin/pending-cancelled-orders",
    badge: null
  },
  {
    title: "Store Sales",
    url: "/admin/store-sales",
    badge: null
  }
]

// Products & Inventory group
const productsSubItems = [
  {
    title: "Products",
    url: "/admin/products",
    badge: null
  },
  {
    title: "Categories",
    url: "/admin/categories",
    badge: null
  },
  {
    title: "Offers",
    url: "/admin/offers",
    badge: null
  },
  {
    title: "Inventory",
    url: "/admin/inventory",
    badge: null
  },
  {
    title: "Stock Alerts",
    url: "/admin/stock-alerts",
    badge: null
  },
]

// Deliveries group
const deliveriesSubItems = [
  {
    title: "Deliveries",
    url: "/admin/deliveries",
    badge: null
  },
  {
    title: "Delivery Areas",
    url: "/admin/delivery-areas",
    badge: null
  }
]

// People Management group (Vendors, Customers)
const peopleSubItems = [
  {
    title: "Vendors",
    url: "/admin/vendors",
    badge: null
  },
  {
    title: "Customers",
    url: "/admin/customers",
    badge: null
  }
]

// Support group
const supportSubItems = [
  {
    title: "Chat Support",
    url: "/admin/chat",
    badge: "Soon"
  },
  {
    title: "Contact Submissions",
    url: "/admin/contact-submissions",
    badge: null
  }
]

export function AdminSidebar() {
  const { state, isMobile, setOpenMobile } = useSidebar()
  const location = useLocation()
  const currentPath = location.pathname
  const [ordersOpen, setOrdersOpen] = useState(false)
  const [productsOpen, setProductsOpen] = useState(false)
  const [deliveriesOpen, setDeliveriesOpen] = useState(false)
  const [peopleOpen, setPeopleOpen] = useState(false)
  const [supportOpen, setSupportOpen] = useState(false)
  const [accountsOpen, setAccountsOpen] = useState(false)

  // Close other expansions when one is opened
  const handleToggle = (section: string) => {
    if (section === 'orders') {
      setOrdersOpen(!ordersOpen)
      setProductsOpen(false)
      setDeliveriesOpen(false)
      setPeopleOpen(false)
      setSupportOpen(false)
      setAccountsOpen(false)
    } else if (section === 'products') {
      setProductsOpen(!productsOpen)
      setOrdersOpen(false)
      setDeliveriesOpen(false)
      setPeopleOpen(false)
      setSupportOpen(false)
      setAccountsOpen(false)
    } else if (section === 'deliveries') {
      setDeliveriesOpen(!deliveriesOpen)
      setOrdersOpen(false)
      setProductsOpen(false)
      setPeopleOpen(false)
      setSupportOpen(false)
      setAccountsOpen(false)
    } else if (section === 'people') {
      setPeopleOpen(!peopleOpen)
      setOrdersOpen(false)
      setProductsOpen(false)
      setDeliveriesOpen(false)
      setSupportOpen(false)
      setAccountsOpen(false)
    } else if (section === 'support') {
      setSupportOpen(!supportOpen)
      setOrdersOpen(false)
      setProductsOpen(false)
      setDeliveriesOpen(false)
      setPeopleOpen(false)
      setAccountsOpen(false)
    } else if (section === 'accounts') {
      setAccountsOpen(!accountsOpen)
      setOrdersOpen(false)
      setProductsOpen(false)
      setDeliveriesOpen(false)
      setPeopleOpen(false)
      setSupportOpen(false)
    }
  }

  const isActive = (path: string, exact?: boolean) => {
    if (exact) {
      return currentPath === path
    }
    return currentPath.startsWith(path)
  }

  const isCollapsed = state === "collapsed"

  const handleNavClick = () => {
    // Close mobile sidebar when navigation link is clicked
    if (isMobile) {
      setOpenMobile(false)
    }
  }

  return (
    <Sidebar 
      collapsible="icon"
      className="border-r border-border/40 bg-sidebar transition-all duration-300 ease-in-out h-screen md:w-auto"
      side="left"
    >
      <SidebarHeader className="border-b border-border/40 p-3 md:p-4 flex-shrink-0">
        <div className="flex items-center gap-3">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary text-primary-foreground flex-shrink-0">
            <Store className="h-4 w-4" />
          </div>
          {!isCollapsed && (
            <div className="animate-fade-in min-w-0">
              <h2 className="text-lg font-semibold text-foreground truncate">Admin</h2>
              <p className="text-xs text-muted-foreground truncate">Management Portal</p>
            </div>
          )}
        </div>
      </SidebarHeader>

      <SidebarContent className="p-2 flex-1 overflow-y-auto">
        <SidebarGroup>
          <SidebarGroupLabel className={isCollapsed ? "sr-only" : ""}>
            Navigation
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu className="space-y-1">
              {/* Dashboard - Top Section */}
              {topMenuItems.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton
                    asChild
                    tooltip={isCollapsed ? item.title : ""}
                    isActive={isActive(item.url, item.exact)}
                    className={`
                      transition-all duration-200 hover-scale
                      ${isActive(item.url, item.exact) 
                        ? 'bg-primary/10 text-primary border-l-2 border-primary font-medium shadow-sm' 
                        : 'hover:bg-muted/50 hover:text-foreground'
                      }
                    `}
                  >
                    <NavLink 
                      to={item.url} 
                      className="flex items-center gap-3 w-full min-w-0"
                      end={item.exact || false}
                      onClick={handleNavClick}
                    >
                      <item.icon className={`
                        h-4 w-4 shrink-0 transition-colors duration-200
                        ${isActive(item.url, item.exact) ? 'text-primary' : 'text-muted-foreground'}
                      `} />
                      {!isCollapsed && (
                        <span className="animate-fade-in truncate min-w-0">
                          {item.title}
                        </span>
                      )}
                    </NavLink>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
              
              {/* Orders Section with Expansion */}
              <Collapsible open={ordersOpen} onOpenChange={() => handleToggle('orders')}>
                <SidebarMenuItem>
                  <CollapsibleTrigger asChild>
                    <SidebarMenuButton
                      tooltip={isCollapsed ? "Orders Management" : ""}
                      className="hover:bg-muted/50 hover:text-foreground transition-all duration-200"
                    >
                      <ShoppingCart className="h-4 w-4 shrink-0 text-muted-foreground" />
                      {!isCollapsed && (
                        <>
                          <span className="truncate min-w-0">Orders Management</span>
                          {ordersOpen ? (
                            <ChevronDown className="ml-auto h-4 w-4 transition-transform" />
                          ) : (
                            <ChevronRight className="ml-auto h-4 w-4 transition-transform" />
                          )}
                        </>
                      )}
                    </SidebarMenuButton>
                  </CollapsibleTrigger>
                  <CollapsibleContent>
                    <SidebarMenuSub>
                      {ordersSubItems.map((subItem) => (
                        <SidebarMenuSubItem key={subItem.title}>
                          <SidebarMenuSubButton asChild>
                            <NavLink
                              to={subItem.url}
                              className="flex items-center gap-2 w-full"
                              onClick={handleNavClick}
                            >
                              <span className="truncate flex-1">{subItem.title}</span>
                              {subItem.badge && (
                                <span className="text-[10px] text-muted-foreground bg-muted px-1 py-0.5 rounded flex-shrink-0">
                                  {subItem.badge}
                                </span>
                              )}
                            </NavLink>
                          </SidebarMenuSubButton>
                        </SidebarMenuSubItem>
                      ))}
                    </SidebarMenuSub>
                  </CollapsibleContent>
                </SidebarMenuItem>
              </Collapsible>

              {/* Products & Inventory Section with Expansion */}
              <Collapsible open={productsOpen} onOpenChange={() => handleToggle('products')}>
                <SidebarMenuItem>
                  <CollapsibleTrigger asChild>
                    <SidebarMenuButton
                      tooltip={isCollapsed ? "Products & Inventory" : ""}
                      className="hover:bg-muted/50 hover:text-foreground transition-all duration-200"
                    >
                      <Package className="h-4 w-4 shrink-0 text-muted-foreground" />
                      {!isCollapsed && (
                        <>
                          <span className="truncate min-w-0">Products & Inventory</span>
                          {productsOpen ? (
                            <ChevronDown className="ml-auto h-4 w-4 transition-transform" />
                          ) : (
                            <ChevronRight className="ml-auto h-4 w-4 transition-transform" />
                          )}
                        </>
                      )}
                    </SidebarMenuButton>
                  </CollapsibleTrigger>
                  <CollapsibleContent>
                    <SidebarMenuSub>
                      {productsSubItems.map((subItem) => (
                        <SidebarMenuSubItem key={subItem.title}>
                          <SidebarMenuSubButton asChild>
                            <NavLink
                              to={subItem.url}
                              className="flex items-center gap-2 w-full"
                              onClick={handleNavClick}
                            >
                              <span className="truncate flex-1">{subItem.title}</span>
                              {subItem.badge && (
                                <span className="text-[10px] text-muted-foreground bg-muted px-1 py-0.5 rounded flex-shrink-0">
                                  {subItem.badge}
                                </span>
                              )}
                            </NavLink>
                          </SidebarMenuSubButton>
                        </SidebarMenuSubItem>
                      ))}
                    </SidebarMenuSub>
                  </CollapsibleContent>
                </SidebarMenuItem>
              </Collapsible>

              {/* People Management Section (Vendors, Customers) */}
              <Collapsible open={peopleOpen} onOpenChange={() => handleToggle('people')}>
                <SidebarMenuItem>
                  <CollapsibleTrigger asChild>
                    <SidebarMenuButton
                      tooltip={isCollapsed ? "People Management" : ""}
                      className="hover:bg-muted/50 hover:text-foreground transition-all duration-200"
                    >
                      <Users className="h-4 w-4 shrink-0 text-muted-foreground" />
                      {!isCollapsed && (
                        <>
                          <span className="truncate min-w-0">People Management</span>
                          {peopleOpen ? (
                            <ChevronDown className="ml-auto h-4 w-4 transition-transform" />
                          ) : (
                            <ChevronRight className="ml-auto h-4 w-4 transition-transform" />
                          )}
                        </>
                      )}
                    </SidebarMenuButton>
                  </CollapsibleTrigger>
                  <CollapsibleContent>
                    <SidebarMenuSub>
                      {peopleSubItems.map((subItem) => (
                        <SidebarMenuSubItem key={subItem.title}>
                          <SidebarMenuSubButton asChild>
                            <NavLink
                              to={subItem.url}
                              className="flex items-center gap-2 w-full"
                              onClick={handleNavClick}
                            >
                              <span className="truncate flex-1">{subItem.title}</span>
                              {subItem.badge && (
                                <span className="text-[10px] text-muted-foreground bg-muted px-1 py-0.5 rounded flex-shrink-0">
                                  {subItem.badge}
                                </span>
                              )}
                            </NavLink>
                          </SidebarMenuSubButton>
                        </SidebarMenuSubItem>
                      ))}
                    </SidebarMenuSub>
                  </CollapsibleContent>
                </SidebarMenuItem>
              </Collapsible>

              {/* Deliveries Section with Expansion */}
              <Collapsible open={deliveriesOpen} onOpenChange={() => handleToggle('deliveries')}>
                <SidebarMenuItem>
                  <CollapsibleTrigger asChild>
                    <SidebarMenuButton
                      tooltip={isCollapsed ? "Deliveries Management" : ""}
                      className="hover:bg-muted/50 hover:text-foreground transition-all duration-200"
                    >
                      <Truck className="h-4 w-4 shrink-0 text-muted-foreground" />
                      {!isCollapsed && (
                        <>
                          <span className="truncate min-w-0">Deliveries Management</span>
                          {deliveriesOpen ? (
                            <ChevronDown className="ml-auto h-4 w-4 transition-transform" />
                          ) : (
                            <ChevronRight className="ml-auto h-4 w-4 transition-transform" />
                          )}
                        </>
                      )}
                    </SidebarMenuButton>
                  </CollapsibleTrigger>
                  <CollapsibleContent>
                    <SidebarMenuSub>
                      {deliveriesSubItems.map((subItem) => (
                        <SidebarMenuSubItem key={subItem.title}>
                          <SidebarMenuSubButton asChild>
                            <NavLink
                              to={subItem.url}
                              className="flex items-center gap-2 w-full"
                              onClick={handleNavClick}
                            >
                              <span className="truncate flex-1">{subItem.title}</span>
                              {subItem.badge && (
                                <span className="text-[10px] text-muted-foreground bg-muted px-1 py-0.5 rounded flex-shrink-0">
                                  {subItem.badge}
                                </span>
                              )}
                            </NavLink>
                          </SidebarMenuSubButton>
                        </SidebarMenuSubItem>
                      ))}
                    </SidebarMenuSub>
                  </CollapsibleContent>
                </SidebarMenuItem>
              </Collapsible>

              {/* Support Section with Expansion */}
              <Collapsible open={supportOpen} onOpenChange={() => handleToggle('support')}>
                <SidebarMenuItem>
                  <CollapsibleTrigger asChild>
                    <SidebarMenuButton
                      tooltip={isCollapsed ? "Support" : ""}
                      className="hover:bg-muted/50 hover:text-foreground transition-all duration-200"
                    >
                      <Headphones className="h-4 w-4 shrink-0 text-muted-foreground" />
                      {!isCollapsed && (
                        <>
                          <span className="truncate min-w-0">Support</span>
                          {supportOpen ? (
                            <ChevronDown className="ml-auto h-4 w-4 transition-transform" />
                          ) : (
                            <ChevronRight className="ml-auto h-4 w-4 transition-transform" />
                          )}
                        </>
                      )}
                    </SidebarMenuButton>
                  </CollapsibleTrigger>
                  <CollapsibleContent>
                    <SidebarMenuSub>
                      {supportSubItems.map((subItem) => (
                        <SidebarMenuSubItem key={subItem.title}>
                          <SidebarMenuSubButton asChild>
                            <NavLink
                              to={subItem.url}
                              className="flex items-center gap-2 w-full"
                              onClick={handleNavClick}
                            >
                              <span className="truncate flex-1">{subItem.title}</span>
                              {subItem.badge && (
                                <span className="text-[10px] text-muted-foreground bg-muted px-1 py-0.5 rounded flex-shrink-0">
                                  {subItem.badge}
                                </span>
                              )}
                            </NavLink>
                          </SidebarMenuSubButton>
                        </SidebarMenuSubItem>
                      ))}
                    </SidebarMenuSub>
                  </CollapsibleContent>
                </SidebarMenuItem>
              </Collapsible>

              {/* Accounts Section with Expansion */}
              <Collapsible open={accountsOpen} onOpenChange={() => handleToggle('accounts')}>
                <SidebarMenuItem>
                  <CollapsibleTrigger asChild>
                    <SidebarMenuButton
                      tooltip={isCollapsed ? "Accounts" : ""}
                      className="hover:bg-muted/50 hover:text-foreground transition-all duration-200"
                    >
                      <BarChart3 className="h-4 w-4 shrink-0 text-muted-foreground" />
                      {!isCollapsed && (
                        <>
                          <span className="truncate min-w-0">Accounts</span>
                          {accountsOpen ? (
                            <ChevronDown className="ml-auto h-4 w-4 transition-transform" />
                          ) : (
                            <ChevronRight className="ml-auto h-4 w-4 transition-transform" />
                          )}
                        </>
                      )}
                    </SidebarMenuButton>
                  </CollapsibleTrigger>
                  <CollapsibleContent>
                    <SidebarMenuSub>
                      {accountsSubItems.map((subItem) => (
                        <SidebarMenuSubItem key={subItem.title}>
                          <SidebarMenuSubButton asChild>
                            <NavLink
                              to={subItem.url}
                              className="flex items-center gap-2 w-full"
                              onClick={handleNavClick}
                            >
                              <span className="truncate flex-1">{subItem.title}</span>
                              {subItem.badge && (
                                <span className="text-[10px] text-muted-foreground bg-muted px-1 py-0.5 rounded flex-shrink-0">
                                  {subItem.badge}
                                </span>
                              )}
                            </NavLink>
                          </SidebarMenuSubButton>
                        </SidebarMenuSubItem>
                      ))}
                    </SidebarMenuSub>
                  </CollapsibleContent>
                </SidebarMenuItem>
              </Collapsible>

              {/* Bottom Section - Remaining Items */}
              {bottomMenuItems.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton
                    asChild
                    tooltip={isCollapsed ? item.title : ""}
                    isActive={isActive(item.url, item.exact)}
                    className={`
                      transition-all duration-200 hover-scale
                      ${isActive(item.url, item.exact) 
                        ? 'bg-primary/10 text-primary border-l-2 border-primary font-medium shadow-sm' 
                        : 'hover:bg-muted/50 hover:text-foreground'
                      }
                    `}
                  >
                    <NavLink 
                      to={item.url} 
                      className="flex items-center gap-3 w-full min-w-0"
                      end={item.exact || false}
                      onClick={handleNavClick}
                    >
                      <item.icon className={`
                        h-4 w-4 shrink-0 transition-colors duration-200
                        ${isActive(item.url, item.exact) ? 'text-primary' : 'text-muted-foreground'}
                      `} />
                      {!isCollapsed && (
                        <span className="animate-fade-in truncate min-w-0">
                          {item.title}
                        </span>
                      )}
                    </NavLink>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter className="border-t border-border/40 p-3 md:p-4 flex-shrink-0">
        {!isCollapsed && (
          <div className="animate-fade-in">
            <p className="text-xs text-muted-foreground truncate">
              © {new Date().getFullYear()} O Maguva Admin
            </p>
          </div>
        )}
      </SidebarFooter>
    </Sidebar>
  )
}
