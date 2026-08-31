import { Network, Activity, Box, Variable } from "lucide-react";

export interface MathSnippet {
  id: string;
  title: string;
  category: "neural" | "fourier" | "algebra" | "calculus" | "fractal";
  description: string;
  icon: any;
  codeSnippet: string;
}

export const MATH_SNIPPETS: MathSnippet[] = [
  {
    id: "neural-net",
    title: "Neural Network Weights",
    category: "neural",
    description: "Layer nodes with animated weight connections and activation outputs",
    icon: Network,
    codeSnippet: `# Neural Network Layer
layer_1 = [m.Circle(radius=0.35, color="#89b4fa").shift(m.LEFT * 2.5 + m.UP * i) for i in [-1, 0, 1]]
layer_2 = [m.Circle(radius=0.4, color="#a6e3a1").shift(m.RIGHT * 2 + m.UP * i) for i in [-0.6, 0.6]]
lines = [m.Line(n1.get_right(), n2.get_left(), color="#f9e2af", stroke_width=2) for n1 in layer_1 for n2 in layer_2]
self.play(*[m.Create(n) for n in layer_1 + layer_2], *[m.Create(l) for l in lines], run_time=1.5)`,
  },
  {
    id: "fourier-epicycles",
    title: "Fourier Transform Epicycles",
    category: "fourier",
    description: "Rotating circles decomposing harmonic frequencies",
    icon: Activity,
    codeSnippet: `# Fourier Rotating Circles
c1 = m.Circle(radius=1.8, color="#89b4fa").shift(m.LEFT * 1.5)
c2 = m.Circle(radius=0.6, color="#cba6f7").move_to(c1.point_at_angle(0))
vector = m.Line(c1.get_center(), c2.get_center(), color="#f9e2af")
self.play(m.Create(c1), m.Create(c2), m.Create(vector), run_time=1.2)`,
  },
  {
    id: "matrix-3d",
    title: "3D Coordinate & Vector Field",
    category: "algebra",
    description: "3D grid transformation with eigen vectors",
    icon: Box,
    codeSnippet: `# 2D Grid Transform
grid = m.NumberPlane(background_line_style={"stroke_opacity": 0.4})
v1 = m.Vector([2, 1], color="#a6e3a1")
v2 = m.Vector([-1, 2], color="#f38ba8")
self.play(m.Create(grid), m.GrowArrow(v1), m.GrowArrow(v2), run_time=1.5)`,
  },
  {
    id: "integral-area",
    title: "Calculus Riemann Integral",
    category: "calculus",
    description: "Function curve with shaded area under the curve",
    icon: Variable,
    codeSnippet: `# Riemann Sum
ax = m.Axes(x_range=[0, 5], y_range=[0, 6], axis_config={"color": "#cdd6f4"})
curve = ax.plot(lambda x: 0.2 * x**2 + 1, color="#89b4fa")
area = ax.get_area(curve, x_range=[1, 4], color=["#89b4fa", "#a6e3a1"], opacity=0.3)
self.play(m.Create(ax), m.Create(curve), m.FadeIn(area), run_time=1.5)`,
  },
];
