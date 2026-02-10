import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

type RoutePlaceholderProps = {
  title: string;
  description: string;
  routePath: string;
};

export function RoutePlaceholder({
  title,
  description,
  routePath,
}: RoutePlaceholderProps) {
  return (
    <Card>
      <CardHeader className="space-y-3">
        <Badge variant="outline" className="min-h-6 w-fit px-2.5">
          Route Scaffold
        </Badge>
        <CardTitle>{title}</CardTitle>
      </CardHeader>
      <CardContent className="text-muted-foreground space-y-3 text-sm">
        <p>{description}</p>
        <code className="bg-muted text-foreground inline-flex min-h-8 items-center rounded-md px-2 py-1 text-xs">
          {routePath}
        </code>
      </CardContent>
    </Card>
  );
}
