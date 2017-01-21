// playback:
// linha vertical do play vai até 50% do canvas 
// canvas começa a deslizar até o final
// linha vertical do play vai até 100% do canvas

// shortcuts:
// shift + click: joga no array de seleções o quadrado selecionado
// shift + drag: joga no array de seleções os quadrados selecionados
// ctrl + c / v: copia e cola
// ctrl + shift + seta: aumenta mais um na direção
// ctrl + shift + alt + number: transforma o motif

class Billy {
    canvas : HTMLCanvasElement;
    configuration : Configuration;
    measures : Array<Measure>;
    blocks: Array<Block> = new Array<Block>();
    pressed: Array<number> = new Array<number>();

    isDragging: boolean = false;
    isClicking: boolean = false;

    leftButtonClicked: boolean = false;
    rightButtonClicked: boolean = false;
    middleButtonClicked: boolean = false;

    offsetX: number = 0;
    offsetY: number = 0;
    mouseX: number;
    mouseY: number;

    widthMeasures: number = 0;
    heigthMeasures: number = 0;

    constructor(
        _selector: string, 
        _configuration: Configuration, 
        _measures: Array<Measure>) 
    {
        this.measures = _measures;

        this.configuration = new Configuration(
            _configuration.frequencies,
            _configuration.margin, 
            _configuration.width, 
            _configuration.heigth, 
            _configuration.border, 
            _configuration.separation, 
            _configuration.selectedColor, 
            _configuration.backgroundColor,
            _configuration.sensibility,
            _configuration.shortcuts);

        if (this.configuration.shortcuts == null) {
            this.configuration.shortcuts = new Shortcuts(null, null, null, null, null, null, null);
        }

        let that = this;

        this.canvas = <HTMLCanvasElement> document.getElementById(_selector);
            
        this.canvas.addEventListener('keydown', function(e) { 
            that.handleKeyDown(e); 
            console.log('keydown handle called.');
        });

        this.canvas.addEventListener('keyup', function(e) { 
            that.handleKeyUp(e); 
            console.log('keyup handle called.');
        });

        this.canvas.addEventListener('mousedown', function(e) { 
            that.handleMouseDown(e);
            console.log('mousedown handle called.');
        });

        this.canvas.addEventListener('mouseup', function(e) { 
            that.handleMouseUp(e); 
            console.log('mouseup handle called.');
        });

        this.canvas.addEventListener('mousemove', function(e) { 
            that.handleMouseMove(e); 
            console.log('mousemove handle called.');
        });

        this.canvas.addEventListener('mouseout', function(e) { 
            that.handleMouseOut(e); 
            console.log('mouseout handle called.');
        });

        this.canvas.oncontextmenu = function (e) {
            e.preventDefault();
        };

        let factor = 0.05;
        let maxWidth = this.canvas.parentElement.offsetWidth - this.canvas.parentElement.offsetWidth * factor;
        let maxHeigth = (this.configuration.heigth * this.configuration.frequencies) + (this.configuration.border * (this.configuration.frequencies + 1)) + this.configuration.margin * 2;
        
        window.addEventListener('resize', function() {
            // It's necessary to recalculate canvas width everytime the window is resized
            that.canvas.width = that.canvas.parentElement.offsetWidth - that.canvas.parentElement.offsetWidth * factor;
            that.canvas.height = maxHeigth;

            that.offsetX = 0;
            that.offsetY = 0;

            that.draw();
            console.log('resize handle called.');
        });

        this.canvas.width = maxWidth;
        this.canvas.height = maxHeigth;
    }

    draw() {
        let context = this.canvas.getContext("2d");

        let canvasWidthAndWidth = this.canvas.width + this.configuration.width;
        let canvasHeigthAndHeigth = this.canvas.height + this.configuration.heigth;
        let inversedWidth = this.configuration.width * -1
        let inversedHeigth = this.configuration.heigth * -1;

        this.blocks = this.map();

        for (let block of this.blocks) {
            let outX = block.x < inversedWidth || block.x > canvasWidthAndWidth;
            let outY = block.y < inversedHeigth || block.y > canvasHeigthAndHeigth;

            if (outX || outY) {
                continue;
            }

            if (block.selected) {
                context.fillStyle = this.configuration.selectedColor;
            } else {
                context.fillStyle = this.configuration.backgroundColor;
            }

            context.fillRect(block.x, block.y, block.width, block.height);
        }
    }

    map() {
        // That's how the matrix is turned into a array
        // ------------------------------ ---------------- --------
        // --  1  --  4  --  7  --  10 -- --  13 --  16 -- -- 19 --
        // ------------------------------ ---------------- --------
        // --  2  --  5  --  8  --  11 -- --  14 --  17 -- -- 20 --
        // ------------------------------ ---------------- --------
        // --  3  --  6  --  9  --  12 -- --  15 --  18 -- -- 21 --
        // ------------------------------ ---------------- --------
        this.widthMeasures = 0;

        let newBlocks = new Array<Block>();

        let marginAndBorder = this.configuration.margin + this.configuration.border;
        let widthAndBorder = this.configuration.width + this.configuration.border;
        let heigthAndBorder = this.configuration.heigth + this.configuration.border;
        let marginAndSeparation = this.configuration.margin + this.configuration.separation;

        let heigthFrequencies = marginAndBorder;
        
        for (let i = 0; i <= this.measures.length - 1; i++) {
            let measure = this.measures[i];

            let pulsesTimesRhythm = measure.pulses * measure.rhythm;
            let widthPulses = this.widthMeasures + marginAndBorder;

            for (let w = 0; w <= pulsesTimesRhythm - 1; w++) {
                newBlocks.push(new Block(widthPulses - this.offsetX, heigthFrequencies - this.offsetY, this.configuration.width, this.configuration.heigth));

                for (let z = 1; z <= this.configuration.frequencies - 1; z++) {
                    heigthFrequencies += heigthAndBorder;

                    newBlocks.push(new Block(widthPulses - this.offsetX, heigthFrequencies - this.offsetY, this.configuration.width, this.configuration.heigth));
                }

                widthPulses += widthAndBorder;
                heigthFrequencies = marginAndBorder;
            }

            heigthFrequencies = marginAndBorder;

            this.widthMeasures += (pulsesTimesRhythm * this.configuration.width) + ((pulsesTimesRhythm * this.configuration.border)) + marginAndSeparation;
        }

        for (let i = 0; i <= this.blocks.length - 1; i++) {
            newBlocks[i].selected = this.blocks[i].selected;
        }

        this.blocks = newBlocks;
        
        // Because we don't have a separation in the end
        this.widthMeasures = this.widthMeasures - this.configuration.separation;

        return this.blocks;
    }

    behaviorDragging(e) {
        if (!this.isDragging) {
            return;
        }

        var rect = this.canvas.getBoundingClientRect();    

        let x = e.clientX - rect.left;
        let y = e.clientY - rect.top;

        let newX = x - this.mouseX;
        let newY = x - this.mouseY;

        this.offsetX += (newX - newX * this.configuration.sensibility) * -1;
        this.offsetY = 0
        // this._offsetY += (newY - newY * this._configuration._sensibility) * -1;

        this.mouseX = x; 
        this.mouseY = y;

        if (this.widthMeasures < this.canvas.width) { 
            // if sum of measures width is lesser than canvas width, we don't have to worry about offsets
            this.offsetX = 0;
        } 
        else {
            // if it's not, we can't let the draw in canvas offset forever
            if (this.offsetX > this.widthMeasures - this.canvas.width + this.configuration.margin + this.configuration.border) {
                this.offsetX = this.widthMeasures - this.canvas.width + this.configuration.margin + this.configuration.border;
            } 
            else if (this.offsetX < 1) {
                this.offsetX = 0;
            }
        }

        let context = this.canvas.getContext("2d");
        context.clearRect(0, 0, this.canvas.width, this.canvas.height);

        this.draw();
    }

    behaviorClicking(e) {
        if (!this.isClicking || !this.leftButtonClicked) {
            return;
        }

        let sorted: Array<Block> = this.map().slice(0).sort(function(a, b) { 
            if (a.x > b.x) {
                return 1;
            } else if (a.x < b.x) {
                return -1;
            }

            if (a.y < b.y) {
                return -1;
            } else if (a.y > b.y) {
                return 1;
            }
            
            return 0;
        });

        let length = Object.keys(sorted).length;

        // group object by x axis, if click was before this axis
        // we don't need to check other blocks with the same x axis.
        let grouping = { };

        for (let i = 0; i <= length - 1; i++) {
            let block: Block = sorted[i];

            if (grouping[block.y] === undefined) {
                grouping[block.y] = [block.y];
                grouping[block.y].pop();
                grouping[block.y].push(block.x);            
            }
            else {
                grouping[block.y].push(block.x);
            }
        }

        let exit:boolean = false;

        // let's find out clicked block
        // this may be improved
        for (let i = 0; i <= length - 1; i++) {
            if (exit) {
                break;
            }

            let key = Object.keys(grouping)[i]; 

            let yofBlock:number = +key;

            // we don't have to handle blocks not written in the canvas
            if (yofBlock < this.offsetY * -1) {
                continue;
            }

            // click was in border or in margin
            if (this.mouseY < yofBlock) {
                continue;
            }
            
            // must check if click was in range of a block
            if (yofBlock - this.offsetY  <= this.mouseY && this.mouseY < yofBlock + this.configuration.heigth) {
                let xs:[number] = grouping[key];

                for (let w = 0; w <= xs.length; w++) {
                    let xofBlock:number = xs[w];

                    // we don't have to handle blocks not written in the canvas
                    if (xofBlock < this.offsetX * -1) {
                        continue;
                    }

                    // click was in border or in margin
                    if (this.mouseX < xofBlock) {
                        continue;
                    }

                    // found
                    if (xofBlock - this.offsetX <= this.mouseX && this.mouseX < xofBlock + this.configuration.width) {
                        exit = true;
                        
                        let context = this.canvas.getContext("2d");

                        context.fillStyle = this.configuration.selectedColor;
                        context.fillRect(xofBlock, yofBlock, this.configuration.width, this.configuration.heigth);
                        
                        var index = this.blocks.map(function (block) {
                            return block.x.toString() + '-' + block.y;
                        }).indexOf(xofBlock.toString() + '-' + yofBlock.toString());

                        let block = this.blocks[index];
                        block.selected = true;

                        break;
                    }
                }
            }
        }
    }

    behaviorEditing(e) {
    }
    
    handleKeyDown(e) {
        e.preventDefault();
        e.stopPropagation();
    }

    handleKeyUp(e) {
        e.preventDefault();
        e.stopPropagation();
    }

    handleMouseDown(e) {
        e.preventDefault();
        e.stopPropagation();

        let rect = this.canvas.getBoundingClientRect();

        let x = e.clientX - rect.left;
        let y = e.clientY - rect.top;

        this.mouseX = x; 
        this.mouseY = y;
        this.isDragging = true;
        this.isClicking = true;

        switch (e.which) {
            case 1:
                this.leftButtonClicked = true;
                this.rightButtonClicked = false;
                this.middleButtonClicked = false;
                break;
            case 2:
                this.leftButtonClicked = false;
                this.rightButtonClicked = false;
                this.middleButtonClicked = true;
                break;
            case 3:
                this.leftButtonClicked = false;
                this.rightButtonClicked = true;
                this.middleButtonClicked = false;
                break;
            default: 
                this.leftButtonClicked = true;
                this.rightButtonClicked = false;
                this.middleButtonClicked = false;
                break;
        }
    }

    handleMouseUp(e) {
        e.preventDefault();
        e.stopPropagation();

        this.behaviorClicking(e);

        this.isDragging = false;
        this.isClicking = false;
    }

    handleMouseMove(e) {
        e.preventDefault();
        e.stopPropagation();

        if (this.leftButtonClicked) {
            let rect = this.canvas.getBoundingClientRect();
            let x = e.clientX - rect.left;
            let y = e.clientY - rect.top;

            this.mouseX = x; 
            this.mouseY = y;

            this.behaviorClicking(e);
        } 
        else if (this.rightButtonClicked) {
            this.behaviorDragging(e);
        }
        else {
            this.behaviorEditing(e);
        }
    }

    handleMouseOut(e) {
        e.preventDefault();
        e.stopPropagation();
        
        this.isClicking = false;
        this.isDragging = false;
    }
}