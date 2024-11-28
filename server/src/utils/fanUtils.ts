export type FantomDocStructure = 
{
    name: string;
    type: string;
    classes: {  name: string; 
                type: string;
                facets: string[];
                methods: {  
                    name: string; 
                    type: string;
                    params: {
                        name: string; 
                        type: string;
                    }[];
                }[];
                fields: { 
                    name: string; 
                    type: string;
                }[];
            }[];
};

// Removed redundant array notation as the type already represents an array
export type FantomNavStructure = 
{
    name: string;
    type: string;
    classes: {  name: string; 
                type: string;
                methods: { name: string; type: string;}[];
                fields: { name: string; type: string;}[];
            }[];
};

