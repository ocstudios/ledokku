interface IconProps {
    opacity?: number;
    size?: number;
    className?: string;
}

export const MongoIcon: React.FC<IconProps> = ({ opacity, size = 24, ...props }) => (
    <svg width={size} height={size} viewBox={`0 0 24 24`} fill="none" {...props}>
        <path
            d="M17.18 9.518C15.917 3.958 12.938 2.131 12.618 1.432C12.266 0.939 11.885 0 11.885 0C11.883 0.019 11.881 0.031 11.88 0.049V0.062H11.879C11.877 0.077 11.876 0.087 11.875 0.101V0.116H11.873C11.873 0.126 11.871 0.134 11.871 0.142V0.168H11.868C11.867 0.176 11.867 0.186 11.865 0.193V0.214H11.863C11.863 0.221 11.863 0.229 11.861 0.235V0.255H11.859C11.859 0.265 11.858 0.277 11.857 0.287V0.289C11.854 0.306 11.851 0.323 11.848 0.339V0.347H11.846C11.845 0.351 11.843 0.355 11.843 0.359V0.376H11.84V0.398H11.835V0.416H11.83V0.437H11.826V0.456H11.822V0.473H11.816V0.487H11.812V0.505H11.808V0.519H11.803V0.532H11.8V0.547H11.796C11.795 0.548 11.795 0.55 11.795 0.551V0.561H11.792C11.791 0.563 11.791 0.565 11.791 0.567V0.573H11.789C11.788 0.576 11.787 0.581 11.787 0.583C11.784 0.59 11.78 0.597 11.777 0.604V0.606C11.775 0.608 11.773 0.611 11.772 0.613V0.621H11.768V0.629H11.763V0.637H11.76V0.647H11.754V0.661H11.75V0.665H11.746V0.673H11.742V0.684H11.738V0.692H11.732V0.703H11.728V0.711H11.723V0.719H11.72V0.729H11.715V0.737H11.711V0.743H11.707V0.751H11.701V0.76H11.697V0.766H11.692V0.774H11.688V0.785H11.683V0.789H11.68V0.797H11.674V0.801H11.67V0.811H11.666V0.815H11.662V0.823H11.657V0.829H11.654L11.652 0.833V0.837H11.65C11.649 0.839 11.648 0.839 11.648 0.841V0.842H11.647C11.646 0.845 11.645 0.847 11.643 0.849V0.852H11.642C11.637 0.858 11.634 0.864 11.63 0.87V0.871C11.628 0.873 11.623 0.877 11.621 0.881V0.883H11.62C11.619 0.884 11.617 0.885 11.617 0.886V0.889H11.615L11.612 0.892V0.893H11.611C11.611 0.894 11.609 0.895 11.608 0.897V0.901H11.605L11.603 0.903V0.905H11.601C11.601 0.907 11.599 0.907 11.599 0.908V0.911H11.595C11.595 0.912 11.594 0.913 11.593 0.914V0.92H11.59V0.924H11.586V0.93H11.582V0.938H11.577V0.93H11.572V0.934H11.568V0.94H11.563V0.948H11.558V0.952H11.554V0.958H11.55V0.962H11.546V0.97H11.54V0.974H11.536V0.98H11.531V0.984H11.527V0.989H11.522V0.999H11.52V1.003H11.514V1.008H11.51V1.01H11.506V1.014H11.501V1.024H11.497V1.028H11.492V1.032H11.488V1.038H11.483V1.042H11.478V1.046H11.474V1.05H11.47V1.06H11.466V1.065H11.46V1.069H11.456V1.073H11.451V1.079H11.447V1.083H11.442V1.09H11.438V1.094H11.432V1.1H11.43V1.104H11.426V1.108H11.421V1.112H11.417V1.118H11.412V1.122H11.409C11.408 1.123 11.408 1.124 11.408 1.124V1.126H11.406L11.402 1.13C11.402 1.13 11.4 1.132 11.398 1.133V1.139H11.394V1.144H11.39V1.148H11.386V1.152H11.383L11.38 1.155V1.158H11.378L11.376 1.16V1.163H11.374C11.369 1.169 11.367 1.173 11.36 1.179C11.358 1.181 11.352 1.186 11.348 1.189C11.336 1.197 11.321 1.21 11.309 1.221C11.301 1.226 11.293 1.233 11.287 1.238V1.239H11.286C11.27 1.252 11.255 1.264 11.237 1.278V1.279C11.213 1.299 11.19 1.318 11.163 1.341V1.34H11.161C11.104 1.387 11.044 1.44 10.975 1.499V1.5H10.974C10.805 1.648 10.604 1.838 10.379 2.068L10.364 2.083L10.36 2.087C9 3.494 6.857 6.426 6.631 11.164C6.611 11.556 6.615 11.937 6.637 12.308V12.317C6.746 14.184 7.332 15.778 8.065 17.073V17.074C8.357 17.59 8.672 18.059 8.991 18.479V18.48C10.093 19.935 11.218 20.797 11.505 21.006C11.946 22.029 11.905 23.785 11.905 23.785L12.549 24C12.549 24 12.418 22.299 12.602 21.478C12.659 21.221 12.794 21.002 12.951 20.816C13.057 20.741 13.371 20.515 13.748 20.171C13.766 20.152 13.776 20.135 13.792 20.117C15.313 18.699 18.154 15.207 17.18 9.518Z"
            fill="currentColor"
            opacity={opacity}
        />
    </svg>
);