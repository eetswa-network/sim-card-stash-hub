import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import logoMinimalist from "@/assets/logo-minimalist.png";
import logoGradient from "@/assets/logo-gradient.png";
import logoDark from "@/assets/logo-dark.png";
import logoColorful from "@/assets/logo-colorful.png";

const logoOptions = [
  {
    name: "Minimalist",
    description: "Clean and simple design",
    src: logoMinimalist,
  },
  {
    name: "Gradient",
    description: "Modern gradient style",
    src: logoGradient,
  },
  {
    name: "Dark",
    description: "Dark monochromatic theme",
    src: logoDark,
  },
  {
    name: "Colorful",
    description: "Vibrant and engaging",
    src: logoColorful,
  },
];

export default function LogoOptions() {
  return (
    <div className="container mx-auto px-4 py-8">
      <div className="text-center mb-8">
        <h1 className="text-3xl font-bold mb-2">Logo Options</h1>
        <p className="text-muted-foreground">Choose your preferred logo design for Sim Card Stash</p>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {logoOptions.map((logo) => (
          <Card key={logo.name} className="hover:shadow-lg transition-shadow">
            <CardHeader>
              <CardTitle className="text-lg">{logo.name}</CardTitle>
              <CardDescription>{logo.description}</CardDescription>
            </CardHeader>
            <CardContent className="flex justify-center">
              <img 
                src={logo.src} 
                alt={`${logo.name} logo`}
                className="w-32 h-32 object-contain"
              />
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}