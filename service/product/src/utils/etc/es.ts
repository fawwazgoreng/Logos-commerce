import { elasticsearch } from "../../infrastructure/elastisSearch/setup";

export class ElasticModel {
    constructor(
        public readonly id: string,
        private elasticClient = elasticsearch
    ) { }
    
    create = async () => {
    }
}