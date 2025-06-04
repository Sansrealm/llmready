"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import Navbar from "@/components/navbar";
import Footer from "@/components/footer";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";
import { GuideContent } from "./components/GuideContent";
import { ThemeToggle } from "@/components/theme-toggle";

// Types for our table of contents
interface TOCItem {
  id: string;
  text: string;
  level: number;
}

export default function GuidePage() {
  const [activeSection, setActiveSection] = useState<string>("");
  const [progress, setProgress] = useState(0);
  const [toc, setToc] = useState<TOCItem[]>([]);

  // Calculate reading progress and update active section
  useEffect(() => {
    const handleScroll = () => {
      const totalHeight = document.documentElement.scrollHeight - window.innerHeight;
      const progress = (window.scrollY / totalHeight) * 100;
      setProgress(progress);

      // Update active section with improved intersection detection
      const sections = document.querySelectorAll('section[id]');
      let current = '';
      
      // Find the section that's currently most visible in the viewport
      let maxVisibleHeight = 0;
      sections.forEach((section) => {
        const rect = section.getBoundingClientRect();
        const visibleHeight = Math.min(rect.bottom, window.innerHeight) - Math.max(rect.top, 0);
        
        if (visibleHeight > maxVisibleHeight && rect.top <= 100) {
          maxVisibleHeight = visibleHeight;
          current = section.id;
        }
      });
      
      if (current !== activeSection) {
        setActiveSection(current);
      }
    };

    // Add debounce to prevent too frequent updates
    let timeoutId: NodeJS.Timeout;
    const debouncedHandleScroll = () => {
      clearTimeout(timeoutId);
      timeoutId = setTimeout(handleScroll, 100);
    };

    handleScroll(); // Call once on mount
    window.addEventListener('scroll', debouncedHandleScroll);
    return () => {
      window.removeEventListener('scroll', debouncedHandleScroll);
      clearTimeout(timeoutId);
    };
  }, [activeSection]);

  // Generate table of contents on mount
  useEffect(() => {
    const mainSections = document.querySelectorAll('section[id]:not(section[id] section[id])');
    const items: TOCItem[] = [];
    
    mainSections.forEach((section) => {
      const mainHeading = section.querySelector('h2');
      if (mainHeading && section.id) {
        items.push({
          id: section.id,
          text: mainHeading.textContent || '',
          level: 1
        });

        // Add subsections if they exist
        const subsections = section.querySelectorAll('section[id] > h3');
        subsections.forEach((subHeading) => {
          const subSection = subHeading.closest('section');
          if (subSection && subSection.id) {
            items.push({
              id: subSection.id,
              text: subHeading.textContent || '',
              level: 2
            });
          }
        });
      }
    });

    setToc(items);
  }, []);

  const handleNavClick = (e: React.MouseEvent<HTMLAnchorElement>, id: string) => {
    e.preventDefault();
    const element = document.getElementById(id);
    if (element) {
      const yOffset = -80; // Adjust based on your header height
      const y = element.getBoundingClientRect().top + window.pageYOffset + yOffset;
      window.scrollTo({ top: y, behavior: 'smooth' });
    }
  };

  return (
    <div className="flex min-h-screen flex-col bg-white dark:bg-gray-950">
      <Navbar />
      
      {/* Reading Progress Bar */}
      <div 
        className="fixed top-0 left-0 w-full h-1 bg-gray-100 dark:bg-gray-900 z-50"
      >
        <div 
          className="h-full bg-green-600 dark:bg-green-500 transition-all duration-200"
          style={{ width: `${progress}%` }}
        />
      </div>

      <main className="flex-1 container px-4 md:px-6 py-12 max-w-7xl mx-auto">
        <div className="flex flex-col lg:flex-row gap-12">
          {/* Table of Contents Sidebar - Now on the left */}
          <div className="lg:w-1/4 order-2 lg:order-1">
            <div className="sticky top-24">
              <h3 className="text-lg font-semibold mb-6 text-gray-900 dark:text-gray-100">Guide Contents</h3>
              <ScrollArea className="h-[calc(100vh-200px)]">
                <nav className="space-y-2">
                  {toc.map((item, index) => {
                    // Find the parent section for level 2 items
                    const parentSection = item.level === 2 
                      ? toc.find(parent => 
                          parent.level === 1 && 
                          toc.indexOf(parent) < index && 
                          toc.findIndex(next => next.level === 1 && toc.indexOf(next) > toc.indexOf(parent)) > index
                        )
                      : null;

                    const isActive = activeSection === item.id;
                    const isParentActive = parentSection?.id === activeSection;

                    return (
                      <a
                        key={`${item.id}-${index}`}
                        href={`#${item.id}`}
                        onClick={(e) => handleNavClick(e, item.id)}
                        className={cn(
                          "block py-2 text-sm transition-colors duration-200 rounded",
                          // Base hover states
                          item.level === 1 
                            ? "hover:text-green-600 dark:hover:text-green-500" 
                            : "hover:text-gray-900 dark:hover:text-white",
                          {
                            // Level 1 highlighting
                            "text-green-600 dark:text-green-500 font-medium bg-gray-50 dark:bg-gray-900/50": 
                              isActive && item.level === 1,
                            
                            // Level 2 highlighting - now with full white text when active
                            "text-gray-900 dark:text-white font-medium bg-gray-50/50 dark:bg-gray-900/30": 
                              isActive && item.level === 2,
                            
                            // Parent section of active subsection
                            "text-green-600/90 dark:text-green-500/90 bg-gray-50/30 dark:bg-gray-900/20": 
                              item.level === 1 && isParentActive,
                            
                            // Subsection when parent is active
                            "text-gray-800 dark:text-gray-200": 
                              item.level === 2 && isParentActive && !isActive,
                            
                            // Default states
                            "text-gray-700 dark:text-gray-300": 
                              !isActive && !isParentActive,
                            
                            // Indentation and base styling for level 2
                            "pl-4 text-gray-600 dark:text-gray-400": 
                              item.level === 2,
                          }
                        )}
                      >
                        {/* Add subtle indicator for active subsections */}
                        {item.level === 2 && (
                          <span className="inline-flex items-center">
                            {isActive && (
                              <span className="mr-2 text-xs">•</span>
                            )}
                            {item.text}
                          </span>
                        )}
                        {item.level === 1 && item.text}
                      </a>
                    );
                  })}
                </nav>
              </ScrollArea>
            </div>
          </div>

          {/* Main Content */}
          <div className="lg:w-3/4 order-1 lg:order-2">
            <article className="prose prose-lg max-w-none dark:prose-invert prose-headings:text-gray-900 dark:prose-headings:text-gray-100 prose-p:text-gray-700 dark:prose-p:text-gray-300 prose-li:text-gray-700 dark:prose-li:text-gray-300">
              <h1 className="text-4xl font-bold mb-6 text-gray-900 dark:text-gray-50">
                The Complete Quick Guide to LLM Optimization
              </h1>

              <p className="text-xl text-gray-600 dark:text-gray-400 italic mb-10">
                Your website just got analyzed by llmcheck.app. What's next? Here's how to turn those insights into action.
              </p>

              <div className="flex items-center gap-4 text-sm text-gray-500 dark:text-gray-400 mb-8 border-b border-gray-100 dark:border-gray-800 pb-4">
                <div className="flex items-center gap-2">
                  <svg
                    className="w-4 h-4"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                    xmlns="http://www.w3.org/2000/svg"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
                    />
                  </svg>
                  <span>First published: May 19, 2025</span>
                </div>
                <div className="flex items-center gap-2">
                  <svg
                    className="w-4 h-4"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                    xmlns="http://www.w3.org/2000/svg"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
                    />
                  </svg>
                  <span>Last updated: June 4, 2025</span>
                </div>
              </div>

              <div className="bg-blue-50 dark:bg-blue-950/50 p-8 rounded-lg mb-16 shadow-sm">
                <p className="text-lg mb-6 text-gray-700 dark:text-gray-300">
                  Want to quickly check if your website is LLM-ready? Use our free analyzer tool to get instant insights and recommendations.
                </p>
                <Button asChild size="lg" className="font-medium">
                  <Link href="/">
                    Analyze Your Website Now →
                  </Link>
                </Button>
              </div>

              <div className="space-y-16">
                <GuideContent />
              </div>
            </article>
          </div>
        </div>
      </main>

      <Footer />
      
      {/* Theme Toggle */}
      <ThemeToggle />
    </div>
  );
} 